const { test } = require("node:test");
const assert = require("node:assert/strict");

const { getAdminEntityForPage, getDisplayRows } = require("../lib/admin-data.js");

test("las pantallas de administración usan la entidad correcta y muestran los datos reales", () => {
  assert.equal(getAdminEntityForPage("Eventos"), "eventos");
  assert.equal(getAdminEntityForPage("Participantes"), "participantes");
  assert.equal(getAdminEntityForPage("Productos"), "productos");
  assert.equal(getAdminEntityForPage("Campañas"), "campanas");

  const eventos = getDisplayRows("Eventos", [{
    nombre: "Festival Coca-Cola 2026",
    ciudad: "Santa Cruz",
    estado: "activo",
    aforo: 350,
    fecha_inicio: "2026-04-18T16:00:00.000Z",
  }]);

  assert.equal(eventos[0].name, "Festival Coca-Cola 2026");
  assert.equal(eventos[0].city, "Santa Cruz");
  assert.equal(eventos[0].status, "activo");
  assert.equal(eventos[0].metric, 350);
  assert.ok(eventos[0].date.includes("18"));

  const productos = getDisplayRows("Productos", [{
    nombre: "Coca-Cola Zero",
    activo: true,
    precio: 12.5,
    descripcion: "Sin azúcar",
  }]);

  assert.equal(productos[0].name, "Coca-Cola Zero");
  assert.equal(productos[0].status, "activo");
  assert.equal(productos[0].metric, 12.5);
});
