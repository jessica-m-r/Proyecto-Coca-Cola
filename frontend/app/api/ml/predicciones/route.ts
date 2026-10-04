import { getAnalisis } from "@/lib/ml/engine";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  k: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * UC3 — Predicciones de asistencia del próximo evento.
 * Devuelve el agregado (todos los roles del panel) y, opcionalmente con
 * `detalle=1`, la lista por persona (solo para administración; el organizador
 * ve agregados según el PRD §4).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({ k: url.searchParams.get("k") ?? undefined });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Parámetros inválidos" },
        { status: 400 },
      );
    }
    const k = parsed.data.k ?? 20;
    const detalle = url.searchParams.get("detalle") === "1";
    const a = await getAnalisis();
    if (!a.pronostico) {
      return NextResponse.json({
        ok: true,
        data: {
          origen: "heuristica" as const,
          mensaje: "No hay eventos planificados; nada que predecir todavía.",
          predicciones: [],
        },
      });
    }
    const probs = a.prediccionesProximo.map((p) => p.prob_asistencia);
    const esperado = probs.reduce((s, p) => s + p, 0);
    return NextResponse.json({
      ok: true,
      data: {
        origen: a.pronostico.origen,
        confianza: a.pronostico.confianza,
        evento: {
          id: a.pronostico.evento_id,
          nombre: a.pronostico.evento_nombre,
          fecha: a.pronostico.fecha,
        },
        agregado: {
          registrados_actuales: a.pronostico.registrados_actuales,
          asistentes_esperados: Number(esperado.toFixed(1)),
          pct_asistencia_esperado: a.pronostico.registrados_actuales
            ? Number(((esperado / a.pronostico.registrados_actuales) * 100).toFixed(1))
            : 0,
          rango: a.pronostico.asistentes,
        },
        predicciones: detalle ? a.prediccionesProximo.slice(0, k) : undefined,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error del motor ML" },
      { status: 500 },
    );
  }
}
