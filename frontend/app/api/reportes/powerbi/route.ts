import { NextResponse } from "next/server";
import { z } from "zod";
import { registerReport, ReportNotFoundError } from "@/lib/reports";

export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

const schema = z.object({
  evento_id: z.number().int().positive(),
  rol: z.enum(["administrador", "organizador", "marketing"]),
  pagina: z.string().trim().max(60).optional(),
});

// "Abrir en Power BI": deja la apertura en el historial (tipo powerbi, formato
// link) y congela los KPIs del evento. No devuelve archivo.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Solicitud de reporte inválida" }, { status: 400, headers });
  const { evento_id, rol, pagina } = parsed.data;
  try {
    const runId = await registerReport({ eventId: evento_id, tipo: "powerbi", formato: "link", parametros: { origen: "panel", pagina: pagina ?? null }, generadoPor: `panel:${rol}` });
    return NextResponse.json({ ok: true, data: { runId } }, { headers });
  } catch (error) {
    if (error instanceof ReportNotFoundError) return NextResponse.json({ ok: false, error: error.message }, { status: 404, headers });
    return NextResponse.json({ ok: false, error: "No se pudo registrar la apertura en Power BI. Intenta de nuevo." }, { status: 503, headers });
  }
}
