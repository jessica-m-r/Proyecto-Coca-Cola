import { getAnalisis, recomendarProductos } from "@/lib/ml/engine";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  usuario_id: z.coerce.number().int().positive(),
  k: z.coerce.number().int().min(1).max(10).optional(),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      usuario_id: url.searchParams.get("usuario_id") ?? undefined,
      k: url.searchParams.get("k") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "usuario_id es obligatorio y debe ser un entero positivo" },
        { status: 400 },
      );
    }
    const { usuario_id, k = 5 } = parsed.data;
    const a = await getAnalisis();
    const rec = recomendarProductos(a, usuario_id, k);
    return NextResponse.json({
      ok: true,
      data: { usuario_id, origen: rec.origen, items: rec.items },
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error del motor ML" },
      { status: 500 },
    );
  }
}
