import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeEventStatus, stripUnsupportedInsertColumns } from "@/lib/schema-fallback";

const entityMap: Record<string, string> = {
  eventos: "evento",
  campanas: "campana",
  productos: "producto",
  usuarios: "usuario",
  participantes: "usuario",
};

const normalizeKey = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

const parseNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.-]/g, "");
    if (!cleaned || cleaned === "-" || cleaned === ".") return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toIsoDate = (value: unknown) => {
  if (!value) return new Date().toISOString();
  const raw = String(value).trim();
  if (!raw) return new Date().toISOString();
  const asDate = new Date(raw);
  return Number.isNaN(asDate.getTime()) ? new Date().toISOString() : asDate.toISOString();
};

async function getFirstValue<T>(table: string, field: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin.from(table).select(field).limit(1).maybeSingle();
  if (error || !data) return null;
  return data[field as keyof typeof data] as T;
}

async function getRoleIdByName(name: string): Promise<number | null> {
  const normalized = String(name ?? "administrador").trim().toLowerCase();
  const { data, error } = await supabaseAdmin
    .from("role")
    .select("id")
    .ilike("nombre", normalized)
    .limit(1)
    .maybeSingle();

  if (error || !data) return 1;
  return Number(data.id ?? 1);
}

async function buildInsertPayload(entity: string, payload: Record<string, unknown>) {
  const normalized = Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [normalizeKey(key), value]),
  );

  if (entity === "eventos") {
    const allowedEstados = new Set(["planificado", "en_curso", "cerrado"]);
    const rawEstado = typeof normalized.estado === "string" ? normalized.estado.trim().toLowerCase() : "planificado";
    const safeEstado = normalizeEventStatus(rawEstado);

    if (!allowedEstados.has(safeEstado)) {
      return {
        nombre: (normalized.nombre as string) || "Nuevo evento",
        descripcion: (normalized.descripcion as string) || "Evento creado desde el panel administrativo",
        tipo_evento_id: parseNumber(normalized.tipo_evento_id ?? normalized.tipo_evento) ?? (await getFirstValue<number>("tipo_evento", "id")) ?? 1,
        campana_id: parseNumber(normalized.campana_id ?? normalized.campana) ?? (await getFirstValue<number>("campana", "id")) ?? 1,
        organizador_id: (normalized.organizador_id as string) || (await getFirstValue<string>("usuario", "id")) || "00000000-0000-0000-0000-000000000000",
        fecha_inicio: toIsoDate(normalized.fecha_inicio ?? normalized.fecha_y_hora_de_inicio),
        fecha_fin: toIsoDate(normalized.fecha_fin ?? normalized.fecha_y_hora_de_fin),
        ciudad: (normalized.ciudad as string) || "Santa Cruz",
        lugar: (normalized.lugar as string) || (normalized.lugar_y_direccion as string) || "Sin lugar definido",
        direccion: (normalized.direccion as string) || null,
        aforo: parseNumber(normalized.aforo ?? normalized.participantes_esperados) ?? 100,
        presupuesto: parseNumber(normalized.presupuesto) ?? 0,
        objetivo: (normalized.objetivo as string) || (normalized.descripcion as string) || "Objetivo general",
        activo: true,
        estado: "planificado",
      };
    }

    return {
      nombre: (normalized.nombre as string) || "Nuevo evento",
      descripcion: (normalized.descripcion as string) || "Evento creado desde el panel administrativo",
      tipo_evento_id: parseNumber(normalized.tipo_evento_id ?? normalized.tipo_evento) ?? (await getFirstValue<number>("tipo_evento", "id")) ?? 1,
      campana_id: parseNumber(normalized.campana_id ?? normalized.campana) ?? (await getFirstValue<number>("campana", "id")) ?? 1,
      organizador_id: (normalized.organizador_id as string) || (await getFirstValue<string>("usuario", "id")) || "00000000-0000-0000-0000-000000000000",
      estado: safeEstado,
      fecha_inicio: toIsoDate(normalized.fecha_inicio ?? normalized.fecha_y_hora_de_inicio),
      fecha_fin: toIsoDate(normalized.fecha_fin ?? normalized.fecha_y_hora_de_fin),
      ciudad: (normalized.ciudad as string) || "Santa Cruz",
      lugar: (normalized.lugar as string) || (normalized.lugar_y_direccion as string) || "Sin lugar definido",
      direccion: (normalized.direccion as string) || null,
      aforo: parseNumber(normalized.aforo ?? normalized.participantes_esperados) ?? 100,
      presupuesto: parseNumber(normalized.presupuesto) ?? 0,
      objetivo: (normalized.objetivo as string) || (normalized.descripcion as string) || "Objetivo general",
      activo: true,
    };
  }

  if (entity === "campanas") {
    return {
      nombre: (normalized.nombre as string) || "Nueva campaña",
      descripcion: (normalized.descripcion as string) || "Campaña creada desde el panel administrativo",
      fecha_inicio: toIsoDate(normalized.fecha_inicio),
      fecha_fin: toIsoDate(normalized.fecha_fin),
      presupuesto: parseNumber(normalized.presupuesto) ?? 0,
      activa: true,
    };
  }

  if (entity === "productos") {
    return {
      nombre: (normalized.nombre as string) || "Nuevo producto",
      tipo_producto_id: parseNumber(normalized.tipo_producto_id ?? normalized.categoria) ?? (await getFirstValue<number>("tipo_producto", "id")) ?? 1,
      descripcion: (normalized.descripcion as string) || "Producto registrado",
      sku: (normalized.sku as string) || (normalized.codigo_interno_sku as string) || `SKU-${Date.now()}`,
      precio: parseNumber(normalized.precio ?? normalized.valor) ?? 0,
      activo: true,
    };
  }

  if (entity === "usuarios" || entity === "participantes") {
    const roleName =
      (normalized.rol as string) ||
      (normalized.role as string) ||
      (entity === "participantes" ? "participante" : "administrador");

    return {
      role_id: await getRoleIdByName(roleName),
      nombre: (normalized.nombre as string) || "Usuario",
      apellido: (normalized.apellido as string) || "",
      email: (normalized.email as string) || (normalized.correo as string) || `usuario${Date.now()}@local.test`,
      celular: (normalized.celular as string) || "+59100000000",
      ciudad: (normalized.ciudad as string) || "Santa Cruz",
      acepta_marketing: true,
      activo: true,
    };
  }

  return normalized;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const table = entityMap[entity];

  if (!table) {
    return NextResponse.json({ ok: false, error: "Entidad no soportada" }, { status: 404 });
  }

  const { resolveUserRoleIdsForEntity } = await import("@/lib/admin-data");
  const { data: roleRows, error: rolesError } = await supabaseAdmin
    .from("role")
    .select("id,nombre")
    .in("nombre", ["administrador", "organizador", "marketing", "participante"]);

  if (rolesError) {
    return NextResponse.json({ ok: false, error: rolesError.message }, { status: 500 });
  }

  const roleIds = resolveUserRoleIdsForEntity(entity, roleRows ?? []);
  let query = supabaseAdmin.from(table).select("*");

  if (entity === "participantes") {
    query = roleIds.length ? query.in("role_id", roleIds) : query.eq("role_id", -1);
  }
  if (entity === "usuarios") {
    query = roleIds.length ? query.in("role_id", roleIds) : query.eq("role_id", -1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data: data ?? [] }, { status: 200 });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const table = entityMap[entity];

  if (!table) {
    return NextResponse.json({ ok: false, error: "Entidad no soportada" }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const insertPayload = stripUnsupportedInsertColumns(
    await buildInsertPayload(entity, payload),
    table,
  );

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ entity: string }> },
) {
  const { entity } = await context.params;
  const table = entityMap[entity];

  if (!table) {
    return NextResponse.json({ ok: false, error: "Entidad no soportada" }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const id = payload.id;

  if (!id) {
    return NextResponse.json({ ok: false, error: "Falta el id" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from(table).delete().eq("id", String(id));

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
