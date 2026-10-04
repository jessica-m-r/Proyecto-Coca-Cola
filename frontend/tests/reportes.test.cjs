const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const zlib = require("node:zlib");
const ts = require("typescript");

function load(relative, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", relative), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => name in dependencies ? dependencies[name] : require(name), ArrayBuffer, DataView, Uint8Array, TextEncoder, Date, Error, Number, String, Math, Set, URL });
  return module.exports;
}

const xlsx = load("lib/xlsx.ts");
const files = load("lib/report-files.ts", { "@/lib/xlsx": xlsx });

const snapshot = (overrides = {}) => ({ report_run_id: 7, event_id: 13, evento_nombre: "Coca-Cola Experience", generated_at: "2026-10-04T12:00:00+00:00", registrados: 320, asistentes: 270, pct_asistencia: 84.4, interacciones: 161, muestras: 131, pct_participacion: 59.3, consentimientos: 203, conversiones: 65, tasa_conversion: 24.1, canjes: 51, satisfaccion: 4.54, nps: 67.5, recurrencia: 0, ...overrides });

// Lee las entradas de un ZIP sin compresión (lo que genera lib/xlsx.ts).
function unzip(buffer) {
  const entries = {};
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString();
    const data = buffer.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size);
    assert.equal(buffer.readUInt32LE(offset + 14), zlib.crc32(data), `CRC de ${name}`);
    entries[name] = data.toString();
    offset += 30 + nameLength + size;
  }
  return entries;
}

test("el CSV usa las columnas del snapshot, BOM y celdas escapadas", () => {
  const csv = files.snapshotCsv([snapshot({ evento_nombre: 'Fiesta, "Coca"', nps: null })]);
  assert.ok(csv.startsWith("﻿"));
  const [header, row] = csv.slice(1).split("\r\n");
  assert.ok(header.startsWith("Reporte,Generado (UTC),ID evento,Evento,Registrados,Asistentes,Asistencia (%)"));
  assert.ok(header.endsWith("NPS,Recurrencia (%)"));
  assert.equal(row, '7,2026-10-04T12:00:00+00:00,13,"Fiesta, ""Coca""",320,270,84.4,161,131,59.3,203,65,24.1,51,4.54,,0');
});

test("el XLSX es un ZIP válido con números y texto escapado", () => {
  const file = files.reportFile(7, [snapshot({ evento_nombre: "A & B <C>" })], "xlsx");
  assert.equal(file.name, "reporte-7-evento-13.xlsx");
  const entries = unzip(Buffer.from(file.body));
  assert.deepEqual(Object.keys(entries).sort(), ["[Content_Types].xml", "_rels/.rels", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/workbook.xml", "xl/worksheets/sheet1.xml"]);
  const sheet = entries["xl/worksheets/sheet1.xml"];
  assert.ok(sheet.includes('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Reporte</t></is></c>'));
  assert.ok(sheet.includes('<c r="D2" t="inlineStr"><is><t xml:space="preserve">A &amp; B &lt;C&gt;</t></is></c>'));
  assert.ok(sheet.includes('<c r="G2"><v>84.4</v></c>'));
  assert.ok(sheet.includes('<row r="2">'));
});

test("el nombre del archivo distingue un evento de varios", () => {
  assert.equal(files.reportFile(9, [snapshot(), snapshot({ event_id: 14 })], "csv").name, "reporte-9-eventos.csv");
  assert.equal(files.reportFile(9, [snapshot()], "csv").type, "text/csv; charset=utf-8");
});

function reportsApi(rpcResult) {
  const calls = [];
  const snapshots = [snapshot({ report_run_id: 41 })];
  const db = {
    async rpc(name, args) { calls.push({ name, args }); return rpcResult; },
    from(name) {
      let rows = name === "v_report_snapshot" ? snapshots : [{ report_run_id: 41, generated_at: "2026-10-04T12:00:00Z" }];
      const query = {
        select() { return query; },
        eq(key, value) { rows = rows.filter((row) => row[key] === value); return query; },
        order() { return query; },
        async limit() { return { data: rows, error: null }; },
        async range() { return { data: rows, error: null }; },
      };
      return query;
    },
  };
  const reports = load("lib/reports.ts", { "server-only": {}, "@/lib/supabase/server": { createServiceClient: () => db } });
  class FakeResponse { constructor(body, init = {}) { this.body = body; this.status = init.status ?? 200; this.headers = init.headers; } static json(body, init = {}) { return new FakeResponse(body, init); } }
  const api = load("app/api/reportes/route.ts", { "next/server": { NextResponse: FakeResponse }, zod: require("zod"), "@/lib/reports": reports, "@/lib/report-files": files });
  const download = load("app/api/reportes/[id]/route.ts", { "next/server": { NextResponse: FakeResponse }, "@/lib/reports": reports, "@/lib/report-files": files });
  const post = (body) => api.POST({ json: async () => body });
  return { api, download, post, calls };
}

test("Exportar registra el reporte con su snapshot y devuelve el archivo", async () => {
  const { post, calls } = reportsApi({ data: 41, error: null });
  const response = await post({ evento_id: 13, formato: "csv", rol: "marketing", pagina: "Power BI" });
  assert.equal(response.status, 200);
  assert.equal(calls[0].name, "registrar_reporte");
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].args)), { p_event_id: 13, p_tipo_reporte: "kpis_evento", p_formato: "csv", p_parametros: { origen: "panel", pagina: "Power BI" }, p_generado_por: "panel:marketing" });
  assert.equal(response.headers["X-Report-Run-Id"], "41");
  assert.equal(response.headers["Content-Disposition"], 'attachment; filename="reporte-41-evento-13.csv"');
  assert.ok(response.body.includes("Coca-Cola Experience"));
});

test("Exportar valida la solicitud y responde 404 si el evento no existe", async () => {
  const { post, calls } = reportsApi({ data: null, error: { code: "P0002", message: "El evento 99 no existe" } });
  for (const invalid of [null, {}, { evento_id: 0, formato: "csv", rol: "marketing" }, { evento_id: 1, formato: "pdf", rol: "marketing" }, { evento_id: 1, formato: "csv", rol: "cliente" }]) {
    assert.equal((await post(invalid)).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal((await post({ evento_id: 99, formato: "xlsx", rol: "administrador" })).status, 404);
});

test("el historial y la descarga leen las vistas sin crear reportes nuevos", async () => {
  const { api, download, calls } = reportsApi({ data: 1, error: null });
  const history = await api.GET();
  assert.equal(history.body.data.last.report_run_id, 41);
  const request = (query) => ({ url: `https://example.test/api/reportes/41${query}` });
  const file = await download.GET(request("?formato=xlsx"), { params: Promise.resolve({ id: "41" }) });
  assert.equal(file.status, 200);
  assert.equal(file.headers["Content-Type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  assert.equal((await download.GET(request("?formato=pdf"), { params: Promise.resolve({ id: "41" }) })).status, 400);
  assert.equal((await download.GET(request(""), { params: Promise.resolve({ id: "abc" }) })).status, 400);
  assert.equal((await download.GET(request(""), { params: Promise.resolve({ id: "5" }) })).status, 404);
  assert.equal(calls.length, 0);
});
