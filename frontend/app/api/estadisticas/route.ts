import { NextResponse } from "next/server";
import { readStatistics, StatisticsEventNotFoundError } from "@/lib/statistics";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const param = new URL(request.url).searchParams.get("evento_id");
    const eventId = param === null ? undefined : Number(param);
    if (eventId !== undefined && (!Number.isSafeInteger(eventId) || eventId <= 0)) return NextResponse.json({ ok: false, error: "Evento inválido" }, { status: 400, headers });
    const data = await readStatistics(eventId);
    return NextResponse.json({ ok: true, data }, { headers });
  } catch (error) {
    if (error instanceof StatisticsEventNotFoundError) return NextResponse.json({ ok: false, error: error.message }, { status: 404, headers });
    return NextResponse.json({ ok: false, error: "No se pudieron cargar las estadísticas. Intenta de nuevo." }, { status: 503, headers });
  }
}
