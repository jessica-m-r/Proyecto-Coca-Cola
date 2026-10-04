import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la secret key: salta RLS. Solo para código de servidor
// (route handlers, server components, server actions).
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
