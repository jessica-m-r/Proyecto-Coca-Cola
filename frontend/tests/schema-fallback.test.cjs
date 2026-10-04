const { test } = require("node:test");
const assert = require("node:assert/strict");

const { stripUnsupportedInsertColumns, normalizeEventStatus } = require("../lib/schema-fallback.js");

test("normaliza el estado de evento al enum real de Supabase", () => {
  assert.equal(normalizeEventStatus("borrador"), "planificado");
  assert.equal(normalizeEventStatus("activo"), "en_curso");
  assert.equal(normalizeEventStatus("finalizado"), "cerrado");
  assert.equal(normalizeEventStatus("planificado"), "planificado");
  assert.equal(normalizeEventStatus("en_curso"), "en_curso");
  assert.equal(normalizeEventStatus("cerrado"), "cerrado");
});

test("quita columnas no soportadas por el esquema cacheado de Supabase", () => {
  const payload = {
    nombre: "Evento demo",
    activo: true,
    aforo: 250,
    direccion: "Av. Camacho 123",
    estado: "activo",
    campana_id: 1,
    activa: true,
  };

  const cleaned = stripUnsupportedInsertColumns(payload, "evento");

  assert.equal(cleaned.activo, undefined);
  assert.equal(cleaned.aforo, undefined);
  assert.equal(cleaned.direccion, undefined);
  assert.equal(cleaned.activa, undefined);
  assert.equal(cleaned.nombre, "Evento demo");
  assert.equal(cleaned.estado, "activo");
});
