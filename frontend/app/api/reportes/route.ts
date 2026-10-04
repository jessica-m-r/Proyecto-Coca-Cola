import { NextResponse } from "next/server";
import { z } from "zod";
import { readReportHistory, readReportSnapshot, registerReport, ReportNotFoundError } from "@/lib/reports";
import { reportFile } from "@/lib/report-files";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

const schema = z.object({
  evento_id: z.number().int().positive(),
  formato: z.enum(["csv", "xlsx"]),
  rol: z.enum(["administrador", "organizador", "marketing"]),
  pagina: z.string().trim().max(60).optional(),
});

export async function GET() {
  try {
    const history = await readReportHistory();
    return NextResponse.json({ ok: true, data: { history, last: history[0] ?? null } }, { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo cargar el historial de reportes." }, { status: 503, headers });
  }
}

// Registra el reporte (report_runs + snapshot de KPIs) y devuelve el archivo.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Solicitud de reporte inválida" }, { status: 400, headers });
  const { evento_id, formato, rol, pagina } = parsed.data;
  try {
    const runId = await registerReport({ eventId: evento_id, tipo: "kpis_evento", formato, parametros: { origen: "panel", pagina: pagina ?? null }, generadoPor: `panel:${rol}` });
    const file = reportFile(runId, await readReportSnapshot(runId), formato);
    return new NextResponse(file.body, { headers: { ...headers, "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.name}"`, "X-Report-Run-Id": String(runId) } });
  } catch (error) {
    if (error instanceof ReportNotFoundError) return NextResponse.json({ ok: false, error: error.message }, { status: 404, headers });
    return NextResponse.json({ ok: false, error: "No se pudo generar el reporte. Intenta de nuevo." }, { status: 503, headers });
  }
}
