import { getAnalisis } from "@/lib/ml/engine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const a = await getAnalisis();
    return NextResponse.json({
      ok: true,
      data: {
        calculado_at: a.calculado_at,
        origen: a.modelos[0]?.estado === "activo" ? "modelo" : "heuristica",
        confianza: a.totalUsuarios >= 200 && a.modelos[1]?.metricas.auc != null ? "media" : "baja",
        segmentos: a.segmentos,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error del motor ML" },
      { status: 500 },
    );
  }
}
