import { NextResponse } from "next/server";
import { readSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    return NextResponse.json({ ok: true, data: await readSessionUser() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "No se pudo consultar la sesión. Intenta nuevamente." }, { status: 503 });
  }
}
