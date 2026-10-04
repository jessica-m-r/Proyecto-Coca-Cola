import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "Faltan variables de entorno de Supabase: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SECRET_KEY. Verifica frontend/.env.local y reinicia el servidor.",
  );
}

// Cliente con la secret key: salta RLS. Solo para código de servidor
// (route handlers, server components, server actions).
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
