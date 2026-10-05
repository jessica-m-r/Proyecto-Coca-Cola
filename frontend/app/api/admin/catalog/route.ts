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
    if (roles.error) throw roles.error;
    const organizerRoleIds = roleRows.filter(role => ["administrador", "organizador"].includes(role.nombre)).map(role => role.id);
    const organizerQuery = await supabaseAdmin.from("usuario").select("id,nombre,apellido").in("role_id", organizerRoleIds).order("nombre");
    if (organizerQuery.error) throw organizerQuery.error;

    return NextResponse.json({
      ok: true,
      data: {
        tipo_evento: tipoEvento,
        campana: campanas,
        tipo_producto: tipoProducto,
        role: roleRows,
        organizador: (organizerQuery.data ?? []).map(user => ({ id: user.id, nombre: `${user.nombre} ${user.apellido ?? ""}`.trim() })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo cargar el catálogo" },
      { status: 500 },
    );
  }
}
