#!/usr/bin/env bash
# Healthcheck de punta a punta: entorno, base de datos, backend y frontend.
# Uso: ./scripts/healthcheck.sh            (usa el server en :3000 o arranca uno temporal)
#      SKIP_LINT=1 ./scripts/healthcheck.sh
# Nunca imprime valores de claves: solo presencia y formato.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT="$ROOT/frontend"
BACK="$ROOT/backend"
PORT="${PORT:-3000}"
BASE="http://localhost:$PORT"

pass=0; fail=0
ok()   { echo "  [OK]    $*"; pass=$((pass + 1)); }
bad()  { echo "  [FALLO] $*"; fail=$((fail + 1)); }
step() { echo; echo "== $*"; }

# ---------------------------------------------------------------- Fase 1
step "Fase 1: Entorno"

node_major=$(node -v 2>/dev/null | sed 's/^v//; s/\..*//')
[ -n "$node_major" ] && [ "$node_major" -ge 18 ] && ok "node $(node -v)" || bad "node >= 18 no encontrado"
command -v npm >/dev/null && ok "npm $(npm -v)" || bad "npm no encontrado"
command -v supabase >/dev/null && ok "supabase CLI $(supabase --version 2>/dev/null)" || bad "supabase CLI no encontrado"

ENV_FILE=""
for f in "$FRONT/.env.local" "$FRONT/.env"; do [ -f "$f" ] && ENV_FILE="$f" && break; done
if [ -z "$ENV_FILE" ]; then
  bad "no existe frontend/.env ni frontend/.env.local"
else
  ok "archivo de entorno: ${ENV_FILE#$ROOT/}"
  getvar() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '"'"'"' \r'; }
  url=$(getvar NEXT_PUBLIC_SUPABASE_URL)
  pubk=$(getvar NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  seck=$(getvar SUPABASE_SECRET_KEY)
  [[ "$url" =~ ^https://[a-z0-9]+\.supabase\.co$ ]] && ok "NEXT_PUBLIC_SUPABASE_URL con formato correcto" \
    || bad "NEXT_PUBLIC_SUPABASE_URL ausente o mal formada (esperado https://<ref>.supabase.co, sin / final)"
  [[ "$pubk" == sb_publishable_* && ${#pubk} -gt 20 ]] && ok "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY presente (sb_publishable_)" \
    || bad "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente o con formato incorrecto"
  [[ "$seck" == sb_secret_* && ${#seck} -gt 20 ]] && ok "SUPABASE_SECRET_KEY presente (sb_secret_)" \
    || bad "SUPABASE_SECRET_KEY ausente o con formato incorrecto"
  grep -qE '^NEXT_PUBLIC_[A-Z_]*SECRET' "$ENV_FILE" && bad "hay una variable NEXT_PUBLIC_*SECRET* en el entorno" \
    || ok "ninguna secret expuesta como NEXT_PUBLIC_"
fi

cd "$ROOT"
for f in .env frontend/.env frontend/.env.local; do
  git check-ignore -q "$f" && ok "$f ignorado por git" || bad "$f NO está en .gitignore"
done
git ls-files --error-unmatch frontend/.env frontend/.env.local .env >/dev/null 2>&1 \
  && bad "algún .env está versionado en git" || ok "ningún .env versionado"

# ---------------------------------------------------------------- Fase 2
step "Fase 2: Base de datos"

cd "$BACK"
# La salida es JSON o tabla según el entorno; se aceptan ambos formatos.
mig_out=$(supabase migration list 2>/dev/null)
local_n=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
synced=$( {
  echo "$mig_out" | grep -oE '"local":"[0-9]+","remote":"[0-9]+"' | awk -F'"' '$4==$8'
  echo "$mig_out" | tr -d '`' | awk -F'|' '{gsub(/ /,"",$1); gsub(/ /,"",$2)} $1 ~ /^[0-9]+$/ && $1==$2'
} | wc -l)
if [ "$synced" -eq "$local_n" ] && [ "$local_n" -gt 0 ]; then
  ok "$synced/$local_n migraciones presentes en local y remoto"
else
  bad "migraciones desincronizadas ($synced sincronizadas de $local_n locales)"
fi

types_tmp=$(mktemp)
if supabase gen types typescript --linked >"$types_tmp" 2>/dev/null && [ -s "$types_tmp" ]; then
  if cmp -s "$types_tmp" "$FRONT/lib/database.types.ts"; then
    ok "lib/database.types.ts al día con el remoto"
  else
    bad "lib/database.types.ts desactualizado (corre: npm run db:types)"
  fi
else
  bad "no se pudieron generar tipos (¿supabase link hecho?)"
fi
rm -f "$types_tmp"

# ---------------------------------------------------------------- Fase 3
step "Fase 3: Backend"

cd "$FRONT"
[ -d node_modules ] || npm install --silent
npx tsc --noEmit >/dev/null 2>&1 && ok "tsc --noEmit sin errores" || bad "tsc --noEmit con errores"
if [ -z "${SKIP_LINT:-}" ]; then
  lint_out=$(npm run lint 2>&1)
  echo "$lint_out" | grep -qE '^[0-9]+:[0-9]+ +Error' && bad "lint con errores" || ok "lint sin errores"
fi

started=""
if ! curl -s -o /dev/null -m 3 "$BASE"; then
  log=$(mktemp)
  npx next dev -p "$PORT" >"$log" 2>&1 &
  started=$!
  for _ in $(seq 1 60); do grep -q "Ready" "$log" && break; sleep 1; done
  grep -q "Ready" "$log" && ok "next dev arrancado (temporal, pid $started)" || bad "next dev no llegó a Ready"
else
  ok "server ya corriendo en $BASE"
fi
# npx -> next -> worker: se mata quien escuche en el puerto, no solo el pid directo.
cleanup() {
  [ -z "$started" ] && return
  kill "$started" 2>/dev/null
  pids=$(ss -ltnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | sort -u)
  [ -n "$pids" ] && kill $pids 2>/dev/null
}
trap cleanup EXIT

body=$(curl -s -m 60 "$BASE/api/test-supabase")
echo "$body" | grep -q '"ok":true' && ok "GET /api/test-supabase -> ok:true" || bad "GET /api/test-supabase no devuelve ok:true"

# RLS: publishable no debe leer tablas privadas ni escribir; secret sí lee.
probe="$FRONT/.healthcheck-rls.mjs"
cat >"$probe" <<'EOF'
import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const opts = { auth: { persistSession: false } };
const pub = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, opts);
const adm = createClient(url, process.env.SUPABASE_SECRET_KEY, opts);
const priv = ["usuario", "evento", "registro_asistido", "qr", "check_in", "venta", "cupon", "surveys", "v_event_kpis"];
let bad = 0;
for (const t of priv) {
  const a = await adm.from(t).select("*", { count: "exact", head: true });
  const p = await pub.from(t).select("*", { count: "exact", head: true });
  if (a.error) { console.log(`FAIL admin no puede leer ${t}: ${a.error.message}`); bad++; }
  if (!p.error && p.count > 0) { console.log(`FAIL publishable lee ${p.count} filas de ${t}`); bad++; }
}
const ins = await pub.from("evento").insert({ nombre: "healthcheck-probe" }).select();
if (!ins.error) { console.log("FAIL publishable pudo insertar en evento"); bad++; }
console.log(bad ? `RLS_FAIL ${bad}` : "RLS_OK");
EOF
rls_out=$(node --env-file="$ENV_FILE" "$probe" 2>&1)
rm -f "$probe"
if echo "$rls_out" | grep -q RLS_OK; then
  ok "RLS: publishable sin acceso a tablas privadas ni escritura; secret lee todo"
else
  bad "RLS:"; echo "$rls_out" | grep FAIL | sed 's/^/          /'
fi

# ---------------------------------------------------------------- Fase 4
step "Fase 4: Frontend"

for p in / /datos; do
  code=$(curl -s -o /tmp/hc_page.$$ -w '%{http_code}' -m 90 "$BASE$p")
  if [ "$code" = 200 ] && ! grep -q "No se pudieron cargar" /tmp/hc_page.$$; then
    ok "GET $p -> 200"
  else
    bad "GET $p -> $code"
  fi
done
rm -f /tmp/hc_page.$$

leaks=$(grep -rlE "^['\"]use client['\"]" app components lib 2>/dev/null \
  | xargs -r grep -lE "supabase/(admin|server)|SUPABASE_SECRET_KEY" || true)
[ -z "$leaks" ] && ok "ningún 'use client' importa lib/supabase/admin o server" \
  || bad "componentes cliente que importan código con secret: $leaks"

# ---------------------------------------------------------------- Resumen
echo
echo "== Resultado: $pass OK, $fail fallos"
[ "$fail" -eq 0 ]
