export type PowerBiConfig = {
  embedUrl: string | null;
  filter: { table: string; column: string } | null;
  error: string | null;
};

type Env = Record<string, string | undefined>;

export function readPowerBiConfig(env: Env): PowerBiConfig {
  const raw = env.POWERBI_EMBED_URL?.trim();
  const table = env.POWERBI_FILTER_TABLE?.trim();
  const column = env.POWERBI_FILTER_COLUMN?.trim();
  const filter = table && column ? { table, column } : null;
  if (!raw) return { embedUrl: null, filter, error: null };
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") throw new Error();
    return { embedUrl: url.toString(), filter, error: null };
  } catch {
    return { embedUrl: null, filter, error: "POWERBI_EMBED_URL no es una URL https válida." };
  }
}

// Power BI exige escapar los caracteres especiales de tablas y columnas como _xHHHH_.
const escapeName = (name: string) => name.replace(/[^A-Za-z0-9_]/g, (char) => `_x${char.charCodeAt(0).toString(16).padStart(4, "0")}_`);

export function buildReportUrl(embedUrl: string, filter: PowerBiConfig["filter"], value: number | string | null | undefined) {
  if (!filter || value === null || value === undefined || value === "") return embedUrl;
  const literal = typeof value === "number" ? String(value) : `'${value.replace(/'/g, "''")}'`;
  const url = new URL(embedUrl);
  const hash = url.hash;
  const existing = url.searchParams.get("filter");
  url.searchParams.delete("filter");
  url.hash = "";
  const expression = `${escapeName(filter.table)}/${escapeName(filter.column)} eq ${literal}`;
  const combined = existing ? `(${existing}) and ${expression}` : expression;
  return `${url.toString()}${url.search ? "&" : "?"}filter=${encodeURIComponent(combined)}${hash}`;
}
