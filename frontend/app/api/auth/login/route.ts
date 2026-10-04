import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, iter, salt, hash] = stored.split("$");
  if (algo !== "pbkdf2" || !iter || !salt || !hash) return false;
  const calc = pbkdf2Sync(password, salt, Number(iter), 32, "sha256").toString("hex");
  try {
    return timingSafeEqual(Buffer.from(calc, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  const { data: user } = await supabaseAdmin
    .from("usuario")
    .select("id, nombre, apellido, email, password_hash, activo")
    .ilike("email", email)
    .maybeSingle();

  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json(
      { ok: false, error: "Correo o contraseña incorrectos" },
      { status: 401 },
    );
  }
  if (!user.activo) {
    return NextResponse.json(
      { ok: false, error: "La cuenta está inactiva" },
      { status: 403 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
    },
  });
}
