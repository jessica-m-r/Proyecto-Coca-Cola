const pageEntityMap = {
  "Mis eventos": "eventos",
  Eventos: "eventos",
  "Usuarios y roles": "usuarios",
  Participantes: "participantes",
  Productos: "productos",
  Campañas: "campanas",
};

function getAdminEntityForPage(page) {
  return pageEntityMap[page] || null;
}

function normalizeStatus(value) {
  if (typeof value === "boolean") return value ? "activo" : "inactivo";
  if (typeof value === "string") return value.trim().toLowerCase();
  return "activo";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDisplayRows(page, rows = []) {
  if (!Array.isArray(rows)) return [];

  return rows.map((row, index) => {
    const safeRow = row ?? {};
    const name =
      safeRow.nombre ||
      safeRow.titulo ||
      safeRow.title ||
      safeRow.email ||
      safeRow.sku ||
      `Registro ${index + 1}`;

    const city = safeRow.ciudad || safeRow.lugar || safeRow.ubicacion || "—";
    const status = normalizeStatus(
      safeRow.estado ?? safeRow.activo ?? safeRow.activa ?? safeRow.status,
    );

    let metric = "—";
    if (page === "Participantes") {
      metric = safeRow.role_id ?? safeRow.nivel ?? safeRow.activo ?? "Activo";
    } else if (page === "Productos") {
      metric = safeRow.precio ?? safeRow.valor ?? "—";
    } else if (page === "Campañas") {
      metric = safeRow.presupuesto ?? safeRow.meta ?? "—";
    } else if (page === "Usuarios y roles") {
      metric = safeRow.role_id ?? safeRow.rol ?? safeRow.role ?? "—";
    } else {
      metric = safeRow.aforo ?? safeRow.participantes_esperados ?? safeRow.registros ?? "—";
    }

    const date =
      safeRow.fecha_inicio ||
      safeRow.fecha_fin ||
      safeRow.created_at ||
      safeRow.updated_at ||
      "—";

    return {
      name,
      city,
      status,
      metric,
      date: formatDate(date),
      raw: safeRow,
    };
  });
}

module.exports = {
  getAdminEntityForPage,
  getDisplayRows,
  pageEntityMap,
};
