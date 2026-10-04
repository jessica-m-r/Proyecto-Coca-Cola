import { NextResponse } from "next/server";
import { readReportSnapshot, ReportNotFoundError } from "@/lib/reports";
import { reportFile } from "@/lib/report-files";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

// Vuelve a descargar un reporte con sus KPIs congelados; no crea un registro nuevo.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const runId = Number((await params).id);
  const format = new URL(request.url).searchParams.get("formato") ?? "csv";
  if (!Number.isSafeInteger(runId) || runId <= 0 || (format !== "csv" && format !== "xlsx")) return NextResponse.json({ ok: false, error: "Solicitud inválida" }, { status: 400, headers });
  try {
    const file = reportFile(runId, await readReportSnapshot(runId), format);
    return new NextResponse(file.body, { headers: { ...headers, "Content-Type": file.type, "Content-Disposition": `attachment; filename="${file.name}"` } });
  } catch (error) {
    if (error instanceof ReportNotFoundError) return NextResponse.json({ ok: false, error: error.message }, { status: 404, headers });
    return NextResponse.json({ ok: false, error: "No se pudo descargar el reporte. Intenta de nuevo." }, { status: 503, headers });
  }
}
