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
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => name in dependencies ? dependencies[name] : require(name), Date, Error, String, URL, encodeURIComponent });
  return module.exports;
}

const powerbi = load("lib/powerbi.ts");

test("sin URL no hay reporte y una URL no https se rechaza", () => {
  assert.equal(JSON.stringify(powerbi.readPowerBiConfig({})), JSON.stringify({ embedUrl: null, reportUrl: null, filter: null, error: null, reportError: null }));
  assert.equal(powerbi.readPowerBiConfig({ POWERBI_EMBED_URL: "  " }).embedUrl, null);
  const insecure = powerbi.readPowerBiConfig({ POWERBI_EMBED_URL: "http://app.powerbi.com/view?r=x" });
  assert.equal(insecure.embedUrl, null);
  assert.ok(insecure.error);
  assert.ok(powerbi.readPowerBiConfig({ POWERBI_EMBED_URL: "no es url" }).error);
});

test("Abrir en Power BI solo se habilita con POWERBI_REPORT_URL válida", () => {
  const empty = powerbi.readPowerBiConfig({ POWERBI_EMBED_URL: "https://app.powerbi.com/reportEmbed?reportId=abc" });
  assert.equal(empty.reportUrl, null);
  assert.equal(empty.reportError, null);
  assert.equal(powerbi.readPowerBiConfig({ POWERBI_REPORT_URL: "   " }).reportUrl, null);
  for (const invalid of ["http://app.powerbi.com/reports/abc", "no es url"]) {
    const config = powerbi.readPowerBiConfig({ POWERBI_REPORT_URL: invalid });
    assert.equal(config.reportUrl, null);
    assert.equal(config.reportError, "POWERBI_REPORT_URL no es una URL https válida.");
  }

  const config = powerbi.readPowerBiConfig({
    POWERBI_EMBED_URL: "https://app.powerbi.com/reportEmbed?reportId=abc",
    POWERBI_REPORT_URL: "https://app.powerbi.com/reports/abc/Resumen",
    POWERBI_FILTER_TABLE: "v_event_kpis",
    POWERBI_FILTER_COLUMN: "evento_id",
  });
  assert.equal(config.reportUrl, "https://app.powerbi.com/reports/abc/Resumen");
  assert.equal(config.error, null);
  assert.equal(config.reportError, null);
  const url = powerbi.buildReportUrl(config.reportUrl, config.filter, 13);
  assert.equal(url, `https://app.powerbi.com/reports/abc/Resumen?filter=${encodeURIComponent("v_event_kpis/evento_id eq 13")}`);
  assert.equal(powerbi.buildReportUrl(config.reportUrl, config.filter, null), "https://app.powerbi.com/reports/abc/Resumen");
});

test("el filtro solo se aplica con tabla y columna definidas", () => {
  const base = "https://app.powerbi.com/reportEmbed?reportId=abc&autoAuth=true";
  const config = powerbi.readPowerBiConfig({ POWERBI_EMBED_URL: base, POWERBI_FILTER_TABLE: "v_event_kpis" });
  assert.equal(config.filter, null);
  assert.equal(powerbi.buildReportUrl(config.embedUrl, config.filter, 7), base);
});

test("construye el filtro de URL escapando nombres y conservando el hash", () => {
  const filter = { table: "Event KPIs", column: "evento_id" };
  const url = powerbi.buildReportUrl("https://app.powerbi.com/reportEmbed?reportId=abc#x", filter, 7);
  assert.equal(url, `https://app.powerbi.com/reportEmbed?reportId=abc&filter=${encodeURIComponent("Event_x0020_KPIs/evento_id eq 7")}#x`);
  assert.equal(powerbi.buildReportUrl("https://app.powerbi.com/reportEmbed", filter, null), "https://app.powerbi.com/reportEmbed");
  const combined = powerbi.buildReportUrl("https://app.powerbi.com/reportEmbed?filter=A/b%20eq%201", filter, "O'Brien");
  assert.equal(decodeURIComponent(combined.split("filter=")[1]), "(A/b eq 1) and Event_x0020_KPIs/evento_id eq 'O''Brien'");
});
