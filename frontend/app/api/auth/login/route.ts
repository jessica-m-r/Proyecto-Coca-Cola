import { createServiceClient } from "@/lib/supabase/server";
import { sessionResponse } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { loginSchema as schema } from "@/lib/auth/forms";

function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [algo, iter, salt, hash] = stored.split("$");
  if (algo !== "pbkdf2" || !iter || !salt || !hash) return false;
  if (!/^\d+$/.test(iter) || Number(iter) < 1 || Number(iter) > 1_000_000) return false;
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
      { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos", field: parsed.error.issues[0]?.path[0] },
      { status: 400 },
    );
  }
  try {
    const db = createServiceClient();
    const { email, password, remember } = parsed.data;

    const { data: user, error } = await db
      .from("usuario")
      .select("id, nombre, apellido, email, password_hash, activo, role_id")
      .eq("email", email)
      .maybeSingle();

    if (error) throw error;
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

    const { data: role, error: roleError } = await db.from("role").select("nombre").eq("id", user.role_id).maybeSingle();
    if (roleError) throw roleError;
    if (role?.nombre !== "participante") {
      return NextResponse.json({ ok: false, error: "Este acceso es para cuentas de participantes" }, { status: 403 });
    }
    return sessionResponse({ id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email }, 200, remember);
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo iniciar sesión. Intenta nuevamente." }, { status: 503 });
  }
}
