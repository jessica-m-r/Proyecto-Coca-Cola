import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

async function readCatalog(table: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function GET() {
  try {
    const [tipoEvento, campanas, tipoProducto, roles] = await Promise.all([
      readCatalog("tipo_evento"),
      readCatalog("campana"),
      readCatalog("tipo_producto"),
      supabaseAdmin.from("role").select("id, nombre").order("nombre", { ascending: true }),
    ]);

    const roleRows = roles.data ?? [];

    return NextResponse.json({
      ok: true,
      data: {
        tipo_evento: tipoEvento,
        campana: campanas,
        tipo_producto: tipoProducto,
        role: roleRows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar el catálogo" },
      { status: 500 },
    );
  }
}
