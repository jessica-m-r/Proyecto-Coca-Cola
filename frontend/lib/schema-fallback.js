const unsupportedInsertKeysByTable = {
  evento: ["activo", "aforo", "activa", "direccion"],
  campana: ["activa", "activo"],
  producto: ["activo"],
  usuario: ["activo"],
};

const eventStatusMap = {
  borrador: "planificado",
  planificado: "planificado",
  activo: "en_curso",
  en_curso: "en_curso",
  finalizado: "cerrado",
  cerrado: "cerrado",
  cancelado: "cerrado",
  inactivo: "cerrado",
};

function normalizeEventStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return eventStatusMap[raw] ?? "planificado";
}

function stripUnsupportedInsertColumns(payload = {}, tableName) {
  const forbidden = tableName ? unsupportedInsertKeysByTable[tableName] ?? [] : ["activo", "activa"];
  if (!forbidden.length) return payload;

  const cleaned = { ...payload };
  for (const key of forbidden) {
    delete cleaned[key];
  }

  return cleaned;
}

module.exports = {
  unsupportedInsertKeysByTable,
  eventStatusMap,
  normalizeEventStatus,
  stripUnsupportedInsertColumns,
};
