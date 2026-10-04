const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(relative, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => name in dependencies ? dependencies[name] : require(name), Buffer, Date, Set, Error, Number, URL });
  return module.exports;
}

function statistics(tables) {
  const reads = [];
  const db = { from(name) {
    let rows = tables[name] ?? [];
    const query = {
      select() { return query; },
      eq(key, value) { rows = rows.filter((row) => row[key] === value); return query; },
      order(key) { rows = [...rows].sort((a, b) => a[key] > b[key] ? 1 : -1); return query; },
      async range(start, end) { reads.push({ name, start }); return { data: rows.slice(start, end + 1), error: null }; },
    };
    return query;
  } };
  return { ...load("lib/statistics.ts", { "server-only": {}, "@/lib/supabase/server": { createServiceClient: () => db } }), reads };
}

test("base vacía devuelve estados vacíos y pagina más de mil eventos", async () => {
  const empty = await statistics({}).readStatistics();
  assert.equal(empty.selected, null);
  assert.equal(empty.events.length, 0);
  const service = statistics({ v_event_kpis: Array.from({ length: 1001 }, (_, index) => ({ evento_id: index + 1 })) });
  const result = await service.readStatistics(1001);
  assert.equal(result.events.length, 1001);
  assert.equal(result.selected.evento_id, 1001);
  assert.ok(service.reads.some((read) => read.name === "v_event_kpis" && read.start === 1000));
});

test("la API permite consultar sin sesión, valida IDs y detecta eventos inexistentes", async () => {
  const service = statistics({ v_event_kpis: [{ evento_id: 1 }, { evento_id: 2 }] });
  const api = load("app/api/estadisticas/route.ts", {
    "next/server": { NextResponse: { json(body, options = {}) { return { body, status: options.status ?? 200, headers: options.headers }; } } },
    "@/lib/statistics": service,
  });
  const request = (params = "") => ({ url: `https://example.test/api/estadisticas${params}` });
  const initial = await api.GET(request());
  assert.equal(initial.status, 200);
  assert.equal(initial.body.data.events.length, 2);
  for (const invalid of ["0", "-1", "abc", "1.5"]) assert.equal((await api.GET(request(`?evento_id=${invalid}`))).status, 400);
  assert.equal((await api.GET(request("?evento_id=3"))).status, 404);
  const response = await api.GET(request("?evento_id=2"));
  assert.equal(response.status, 200);
  assert.equal(response.body.data.selected.evento_id, 2);
  assert.equal(response.headers["Cache-Control"], "private, no-store");
});
