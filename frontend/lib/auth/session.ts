import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export const SESSION_COOKIE = "cce_user_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function sign(value: string) {
  const secret = process.env.AUTH_SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Falta la clave privada para la sesión");
  return createHmac("sha256", secret).update(`cce-user-session:${value}`).digest("base64url");
}

export function createSessionToken(userId: number) {
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + SESSION_SECONDS * 1000 })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): number | null {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) return null;
    const expected = Buffer.from(sign(payload));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const { id, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isSafeInteger(id) && id > 0 && Number.isFinite(exp) && exp > Date.now() ? id : null;
  } catch {
    return null;
  }
}

export function sessionResponse(user: { id: number; nombre: string; apellido: string | null; email: string | null }, status = 200, remember = false) {
  const response = NextResponse.json({ ok: true, data: user }, { status, headers: { "Cache-Control": "private, no-store" } });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
    ...(remember ? { maxAge: SESSION_SECONDS } : {}),
  });
  return response;
}

export async function readSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = token ? verifySessionToken(token) : null;
  if (!id) return null;
  const db = createServiceClient();
  const { data: user, error } = await db.from("usuario").select("id, nombre, apellido, email, role_id").eq("id", id).eq("activo", true).maybeSingle();
  if (error) throw error;
  if (!user) return null;
  const { data: role, error: roleError } = await db.from("role").select("nombre").eq("id", user.role_id).maybeSingle();
  if (roleError) throw roleError;
  if (role?.nombre !== "participante") return null;
  return { id: user.id, nombre: user.nombre, apellido: user.apellido, email: user.email };
}
