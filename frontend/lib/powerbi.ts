export type PowerBiConfig = {
  embedUrl: string | null;
  reportUrl: string | null;
  filter: { table: string; column: string } | null;
  error: string | null;
  reportError: string | null;
};

type Env = Record<string, string | undefined>;

function readHttpsUrl(raw: string | undefined, name: string) {
  const value = raw?.trim();
  if (!value) return { url: null, error: null };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error();
    return { url: url.toString(), error: null };
  } catch {
    return { url: null, error: `${name} no es una URL https válida.` };
  }
}

export function readPowerBiConfig(env: Env): PowerBiConfig {
  const table = env.POWERBI_FILTER_TABLE?.trim();
  const column = env.POWERBI_FILTER_COLUMN?.trim();
  const filter = table && column ? { table, column } : null;
  const embed = readHttpsUrl(env.POWERBI_EMBED_URL, "POWERBI_EMBED_URL");
  const report = readHttpsUrl(env.POWERBI_REPORT_URL, "POWERBI_REPORT_URL");
  return { embedUrl: embed.url, reportUrl: report.url, filter, error: embed.error, reportError: report.error };
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
