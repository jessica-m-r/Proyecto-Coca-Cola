const { test } = require("node:test");
const assert = require("node:assert/strict");

const { getCatalogOptionsForField } = require("../lib/catalog-options.js");

test("el formulario usa opciones reales de tipos de evento y campañas", () => {
  const options = {
    tipo_evento: [
      { id: 1, nombre: "Concierto" },
      { id: 2, nombre: "Festivales" },
    ],
    campana: [
      { id: 7, nombre: "Ruta de sabores" },
    ],
  };

  assert.deepEqual(getCatalogOptionsForField("tipo_evento_id", options), [
    { value: "1", label: "Concierto" },
    { value: "2", label: "Festivales" },
  ]);

  assert.deepEqual(getCatalogOptionsForField("campana_id", options), [
    { value: "7", label: "Ruta de sabores" },
  ]);
});

test("roles muestran nombres y responsables usan identificadores del catálogo", () => {
  assert.deepEqual(getCatalogOptionsForField("rol", { role: [{ id: 2, nombre: "organizador" }] }), [{ value: "organizador", label: "organizador" }]);
  assert.deepEqual(getCatalogOptionsForField("organizador_id", { organizador: [{ id: 14, nombre: "María Rodríguez" }] }), [{ value: "14", label: "María Rodríguez" }]);
});
