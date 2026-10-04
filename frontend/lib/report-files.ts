import type { Database } from "@/lib/database.types";
import { buildXlsx } from "@/lib/xlsx";

export type ReportSnapshot = Database["public"]["Views"]["v_report_snapshot"]["Row"];
export type ReportHistoryRow = Database["public"]["Views"]["v_report_historial"]["Row"];
export type DownloadFormat = "csv" | "xlsx";

type Cell = string | number | null;

// Mismas columnas que v_report_snapshot en Power BI, con encabezados legibles.
const COLUMNS: [string, (row: ReportSnapshot) => Cell][] = [
  ["Reporte", (row) => row.report_run_id],
  ["Generado (UTC)", (row) => row.generated_at],
  ["ID evento", (row) => row.event_id],
  ["Evento", (row) => row.evento_nombre],
  ["Registrados", (row) => row.registrados],
  ["Asistentes", (row) => row.asistentes],
  ["Asistencia (%)", (row) => row.pct_asistencia],
  ["Interacciones", (row) => row.interacciones],
  ["Muestras", (row) => row.muestras],
  ["Participación (%)", (row) => row.pct_participacion],
  ["Consentimientos", (row) => row.consentimientos],
  ["Conversiones", (row) => row.conversiones],
  ["Tasa de conversión (%)", (row) => row.tasa_conversion],
  ["Canjes", (row) => row.canjes],
  ["Satisfacción (1-5)", (row) => row.satisfaccion],
  ["NPS", (row) => row.nps],
  ["Recurrencia (%)", (row) => row.recurrencia],
];

export function snapshotTable(rows: ReportSnapshot[]): Cell[][] {
  return [COLUMNS.map(([header]) => header), ...rows.map((row) => COLUMNS.map(([, read]) => read(row) ?? null))];
}

const csvCell = (value: Cell) => {
  const text = value === null ? "" : String(value);
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV con BOM para que Excel respete las tildes. */
export function snapshotCsv(rows: ReportSnapshot[]) {
  return "\uFEFF" + snapshotTable(rows).map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function reportFile(runId: number, rows: ReportSnapshot[], format: DownloadFormat) {
  const eventIds = [...new Set(rows.map((row) => row.event_id))];
  const name = `reporte-${runId}-${eventIds.length === 1 && eventIds[0] !== null ? `evento-${eventIds[0]}` : "eventos"}.${format}`;
  return format === "csv"
    ? { name, type: "text/csv; charset=utf-8", body: snapshotCsv(rows) as string | Uint8Array<ArrayBuffer> }
    : { name, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", body: buildXlsx("Reporte", snapshotTable(rows)) as string | Uint8Array<ArrayBuffer> };
}
