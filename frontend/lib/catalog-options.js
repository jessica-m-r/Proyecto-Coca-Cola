const fieldCatalogMap = {
  tipo_evento_id: "tipo_evento",
  campana_id: "campana",
  tipo_producto_id: "tipo_producto",
  rol: "role",
  role_id: "role",
};

function getCatalogOptionsForField(fieldName, catalog = {}) {
  const entity = fieldCatalogMap[fieldName] ?? null;
  const rows = entity ? (Array.isArray(catalog[entity]) ? catalog[entity] : []) : [];

  return rows
    .map((item) => {
      const value = item?.id ?? item?.value;
      const label = item?.nombre ?? item?.name ?? item?.label ?? item?.value ?? "Sin nombre";

      if (value == null || value === "") return null;
      return { value: String(value), label: String(label) };
    })
    .filter((item) => item !== null && item !== undefined);
}

module.exports = {
  fieldCatalogMap,
  getCatalogOptionsForField,
};
