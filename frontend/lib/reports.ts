import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type { DownloadFormat, ReportHistoryRow, ReportSnapshot } from "@/lib/report-files";

export class ReportNotFoundError extends Error {}

export async function registerReport(input: { eventId: number | null; tipo: string; formato: DownloadFormat | "link"; parametros: Record<string, string | number | boolean | null>; generadoPor: string }) {
  const db = createServiceClient();
  const { data, error } = await db.rpc("registrar_reporte", {
    p_event_id: input.eventId,
    p_tipo_reporte: input.tipo,
    p_formato: input.formato,
    p_parametros: input.parametros,
    p_generado_por: input.generadoPor,
  });
  // P0002: el evento no existe (lo lanza registrar_reporte).
  if (error?.code === "P0002") throw new ReportNotFoundError("El evento no existe");
  if (error) throw error;
  return data;
}

export async function readReportHistory(limit = 50): Promise<ReportHistoryRow[]> {
  const db = createServiceClient();
  const { data, error } = await db.from("v_report_historial").select("*").order("generated_at", { ascending: false }).order("report_run_id", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function readReportSnapshot(runId: number): Promise<ReportSnapshot[]> {
  const db = createServiceClient();
  const rows: ReportSnapshot[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from("v_report_snapshot").select("*").eq("report_run_id", runId).order("event_id").range(offset, offset + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  if (!rows.length) throw new ReportNotFoundError("El reporte no existe");
  return rows;
}
