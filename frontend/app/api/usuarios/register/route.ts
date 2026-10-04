import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { z } from "zod";

const RANGO_EDAD: Record<string, string> = {
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

const ROLE_PARTICIPANTE = 4;

const schema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio"),
  apellido: z.string().trim().min(2, "El apellido es obligatorio"),
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  celular: z.string().trim().min(6, "Celular inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  ciudad: z.string().trim().optional(),
  age: z.string().optional(),
  preferencias: z
    .union([
      z.array(z.string()),
      z.string().transform((s) => s.split(",").filter(Boolean)),
    ])
    .optional()
    .default([]),
});

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256").toString("hex");
  return `pbkdf2$100000$${salt}$${hash}`;
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
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

  const { data: existing } = await supabaseAdmin
    .from("usuario")
    .select("id, email, celular")
    .or(`email.eq.${email},celular.eq.${celular}`)
    .maybeSingle();

  if (existing) {
    const campo = existing.email?.toLowerCase() === email ? "correo" : "celular";
    return NextResponse.json(
      { ok: false, error: `Ya existe una cuenta con ese ${campo}` },
      { status: 409 },
    );
  }

  const { data: user, error } = await supabaseAdmin
    .from("usuario")
    .insert({
      role_id: ROLE_PARTICIPANTE,
      nombre,
      apellido,
      email,
      celular,
      password_hash: hashPassword(password),
      ciudad: ciudad || null,
      rango_edad: rangoEdad ?? null,
    })
    .select("id, nombre, apellido")
    .single();

  if (error || !user) {
    if (error?.code === "23505" || error?.message?.includes("duplicate key")) {
      return NextResponse.json(
        { ok: false, error: "Ya existe una cuenta con ese correo o celular" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error?.message ?? "No se pudo crear la cuenta" },
      { status: 500 },
    );
  }

  if (preferencias.length > 0) {
    const { data: productos } = await supabaseAdmin
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
      await supabaseAdmin.from("preferencia_calif").insert(rows);
    }
  }

  return NextResponse.json({ ok: true, data: user }, { status: 201 });
}
