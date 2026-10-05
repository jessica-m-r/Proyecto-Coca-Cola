const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const source = fs.readFileSync(path.join(__dirname, "../app/api/admin/[entity]/route.ts"), "utf8");
function api() {
  let inserted;
  const db = { from(table) {
    const q = { select() { return q; }, limit() { return q; }, filter() { return q; },
      async maybeSingle() { return { data: { id: 2 }, error: null }; },
      insert(data) { inserted = { table, data }; return q; },
      async single() { return { data: { id: 99, ...inserted.data }, error: null }; },
    };
    return q;
  } };
  const moduleObject = { exports: {} };
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const deps = { "next/server": { NextResponse: { json(body, options = {}) { return { body, status: options.status ?? 200 }; } } }, "@/lib/supabase/admin": { supabaseAdmin: db }, "@/lib/schema-fallback": require("../lib/schema-fallback.js") };
  vm.runInNewContext(code, { module: moduleObject, exports: moduleObject.exports, require: name => deps[name], Date, Number, String, Set, Map, Object, Error });
  return { ...moduleObject.exports, read: () => inserted };
}
test("la creación conserva meta, responsable y presupuesto, sin asignar campaña arbitraria", async () => {
  const service = api();
  const response = await service.POST({ json: async () => ({ nombre: "Prueba", tipo_evento_id: 3, organizador_id: 14, fecha_inicio: "2026-10-18T14:00:00-04:00", fecha_fin: "2026-10-18T20:00:00-04:00", participantes_esperados: 220, presupuesto: 2500 }) }, { params: Promise.resolve({ entity: "eventos" }) });
  assert.equal(response.status, 201);
  assert.equal(service.read().data.participantes_esperados, 220);
  assert.equal(service.read().data.presupuesto, 2500);
  assert.equal(service.read().data.organizador_id, 14);
  assert.equal(service.read().data.campana_id, null);
  assert.equal(service.read().data.fecha_inicio, "2026-10-18T18:00:00.000Z");
});
test("productos y usuarios no envían columnas inexistentes ni consentimiento automático", async () => {
  const service = api();
  await service.POST({ json: async () => ({ nombre: "Zero", tipo_producto_id: 1, categoria: "Gaseosa", sabor: "Sin azúcar", presentacion: "500 ml" }) }, { params: Promise.resolve({ entity: "productos" }) });
  assert.equal(service.read().data.sabor, "Sin azúcar");
  assert.equal(service.read().data.presentacion, "500 ml");
  assert.equal(service.read().data.precio, undefined);
  assert.equal(service.read().data.sku, undefined);
  await service.POST({ json: async () => ({ nombre: "Persona", rol: "organizador", email: "persona@example.test", celular: "70000000", rango_edad: "25-34" }) }, { params: Promise.resolve({ entity: "usuarios" }) });
  assert.equal(service.read().data.acepta_marketing, undefined);
  assert.equal(service.read().data.rango_edad, "r25_34");
});
