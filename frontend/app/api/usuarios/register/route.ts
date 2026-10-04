import { createServiceClient } from "@/lib/supabase/server";
import { sessionResponse } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { registerSchema as schema } from "@/lib/auth/forms";
import type { Database } from "@/lib/database.types";

const RANGO_EDAD: Record<string, Database["public"]["Enums"]["rango_edad"]> = {
  "13-17": "menor_18",
  "18-24": "r18_24",
  "25-34": "r25_34",
  "35-44": "r35_44",
  "45-54": "r45_54",
  "55+": "mayor_55",
};

const PREFERENCIA_KEYWORD: Record<string, string> = {
  Original: "Original",
  Zero: "Zero",
  "Zero Sin Azúcar": "Zero",
  Light: "Zero",
  Sprite: "Sprite",
  Fanta: "Fanta Naranja",
  Aguas: "Vital",
};


function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `pbkdf2$100000$${salt}$${hash}`;
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos", field: parsed.error.issues[0]?.path[0] },
      { status: 400 },
    );
  }
  const { nombre, apellido, email, celular, password, ciudad, age, preferencias } =
    parsed.data;

  const rangoEdad = age ? RANGO_EDAD[age.replace(/[–—]/g, "-")] : undefined;
  if (age && !rangoEdad) {
    return NextResponse.json(
      { ok: false, error: "Rango de edad inválido" },
      { status: 400 },
    );
  }

  try {
    const db = createServiceClient();
    // Resolve the participant role instead of relying on an environment-specific ID.
    const { data: role, error: roleError } = await db.from("role").select("id").eq("nombre", "participante").single();
    if (roleError || !role) throw roleError ?? new Error("Rol no disponible");

    const { data: user, error } = await db
      .from("usuario")
      .insert({
        role_id: role.id,
        nombre,
        apellido,
        email,
        celular,
        password_hash: hashPassword(password),
        ciudad: ciudad || null,
        rango_edad: rangoEdad ?? null,
      })
      .select("id, nombre, apellido, email")
      .single();

    if (error || !user) {
      if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
        return NextResponse.json(
          { ok: false, error: "Ya existe una cuenta con ese correo o celular" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { ok: false, error: "No se pudo crear la cuenta. Intenta nuevamente." },
        { status: 500 },
      );
    }

    if (preferencias.length > 0) {
      const { data: productos } = await db
        .from("producto")
        .select("id, nombre");

      const rows = (productos ?? [])
        .filter((p) =>
          preferencias.some((pref) => {
            const kw = PREFERENCIA_KEYWORD[pref] ?? pref;
            return p.nombre.toLowerCase().includes(kw.toLowerCase());
          }),
        )
        .map((p) => ({ usuario_id: user.id, producto_id: p.id, preferencia: "gusta" }));

      if (rows.length > 0) {
        await db.from("preferencia_calif").insert(rows);
      }
    }

    return sessionResponse(user, 201);
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo crear la cuenta. Intenta nuevamente." }, { status: 503 });
  }
}
