import { NextResponse } from "next/server";
import { readPowerBiConfig } from "@/lib/powerbi";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, data: readPowerBiConfig(process.env) }, { headers: { "Cache-Control": "private, no-store" } });
}
