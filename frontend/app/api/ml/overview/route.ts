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
        total_usuarios: a.totalUsuarios,
        usuarios_con_senal: a.usuariosConSenal,
        calidad: a.calidad,
        modelos: a.modelos,
        segmentos_resumen: a.segmentos.map((s) => ({
          codigo: s.codigo, nombre: s.nombre, n_usuarios: s.n_usuarios,
          sabor_preferido: s.sabor_preferido,
        })),
        pronostico: a.pronostico,
        predicciones_n: a.prediccionesProximo.length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error del motor ML" },
      { status: 500 },
    );
  }
}
