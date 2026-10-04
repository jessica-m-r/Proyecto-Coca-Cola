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

function resolveUserRoleIdsForEntity(entity, roles = []) {
  const safeRoles = Array.isArray(roles) ? roles : [];
  const map = new Map(
    safeRoles
      .map((role) => [
        String(role?.nombre ?? "").trim().toLowerCase(),
        Number(role?.id),
      ])
      .filter(([nombre, id]) => nombre && Number.isFinite(id)),
  );

  const namesByEntity = {
    participantes: ["participante"],
    usuarios: ["administrador", "organizador", "marketing"],
  };

  const targetNames = namesByEntity[entity] || [];
  return targetNames
    .map((name) => map.get(name))
    .filter((id) => Number.isFinite(id));
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
    const rawName =
      safeRow.nombre ||
      safeRow.titulo ||
      safeRow.title ||
      safeRow.email ||
      safeRow.sku ||
      `Registro ${index + 1}`;

    const fullName =
      page === "Usuarios y roles" || page === "Participantes"
        ? [safeRow.nombre, safeRow.apellido].filter(Boolean).join(" ").trim() || rawName
        : rawName;

    let city = safeRow.ciudad || safeRow.lugar || safeRow.ubicacion || "—";
    const status = normalizeStatus(
      safeRow.estado ?? safeRow.activo ?? safeRow.activa ?? safeRow.status,
    );

    let metric = "—";
    if (page === "Participantes" || page === "Usuarios y roles") {
      const roleSource =
        typeof safeRow.role === "object" && safeRow.role && "nombre" in safeRow.role
          ? safeRow.role.nombre
          : safeRow.rol || safeRow.role || safeRow.role_nombre || safeRow.roleName || safeRow.role_id;
      metric = roleSource || "Sin rol";
    } else if (page === "Productos") {
      city = safeRow.categoria || safeRow.tipo_producto || safeRow.presentacion || safeRow.sabor || "—";
      const productMetric = safeRow.sabor || safeRow.presentacion || safeRow.categoria || safeRow.descripcion;
      metric = productMetric || (safeRow.precio ?? safeRow.valor ?? "—");
    } else if (page === "Campañas") {
      const campaignDetail = safeRow.objetivo_conversion || safeRow.descripcion || safeRow.meta || "—";
      city = campaignDetail;
      metric = campaignDetail;
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
      name: fullName,
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
  resolveUserRoleIdsForEntity,
  pageEntityMap,
};
