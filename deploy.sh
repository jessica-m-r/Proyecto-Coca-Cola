#!/usr/bin/env bash
# Deploy público: Docker (Next.js) + túnel (cloudflared por defecto, ngrok opcional)
# Uso:
#   ./deploy.sh             → Docker + túnel cloudflared (URL trycloudflare.com)
#   ./deploy.sh --ngrok     → Docker + túnel ngrok (tu dominio estático, requiere sesión única)
#   ./deploy.sh --rebuild   → fuerza reconstrucción de la imagen (tras git pull / cambios en el código)
#   ./deploy.sh --stop      → detener túnel y contenedor
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT/frontend/.env"
NGROK_BIN="$HOME/.local/bin/ngrok"
CLOUDFLARED_BIN="$HOME/.local/bin/cloudflared"
CLOUDFLARED_LOG="/tmp/opencode/cloudflared.log"
NGROK_LOG="/tmp/opencode/ngrok.log"
APP_URL="http://127.0.0.1:3000"
USE_NGROK=0
FORCE_REBUILD=0
[[ "${1:-}" == "--ngrok" ]] && USE_NGROK=1
[[ "${1:-}" == "--rebuild" ]] && FORCE_REBUILD=1

rojo()    { printf '\033[0;31m%s\033[0m\n' "$1"; }
verde()   { printf '\033[0;32m%s\033[0m\n' "$1"; }
azul()    { printf '\033[0;34m%s\033[0m\n' "$1"; }

stop_all() {
  azul "Deteniendo túneles y contenedor..."
  pkill -f "[c]loudflared tunnel" 2>/dev/null || true
  pkill -f "[n]grok http" 2>/dev/null || true
  docker compose down 2>/dev/null || true
  verde "Todo detenido."
  exit 0
}
[[ "${1:-}" == "--stop" ]] && stop_all

# 1. Validar .env
if [[ ! -f "$ENV_FILE" ]]; then
  rojo "Falta frontend/.env. Copia frontend/.env.example y completa los valores."
  exit 1
fi
if grep -qE "your-project-ref|your_publishable_key|your_secret_key" "$ENV_FILE"; then
  rojo "frontend/.env todavía tiene valores de ejemplo. Complétalo con tus credenciales reales."
  exit 1
fi

# 2. Construir y levantar el contenedor (si ya está corriendo y sano, se reutiliza)
azul "[1/3] Construyendo/levantando contenedor Docker..."
if [[ $FORCE_REBUILD -eq 0 ]] && docker ps --filter "name=coca-cola-frontend" --filter "health=healthy" | grep -q coca-cola-frontend; then
  verde "Contenedor ya está corriendo y sano; se reutiliza."
else
  docker compose --env-file "$ENV_FILE" up -d --build
fi

# 3. Esperar a que la app responda
azul "[2/3] Esperando que la app responda en $APP_URL ..."
for i in $(seq 1 60); do
  curl -sf -o /dev/null "$APP_URL" && break
  [[ $i -eq 60 ]] && { rojo "La app no respondió en 120s. Revisa: docker compose logs"; exit 1; }
  sleep 2
done
verde "App corriendo en $APP_URL"

# 4. Túnel público
mkdir -p /tmp/opencode
if [[ $USE_NGROK -eq 1 ]]; then
  # ---------- ngrok (dominio estático de la cuenta; solo 1 sesión a la vez) ----------
  if ! "$NGROK_BIN" config check >/dev/null 2>&1; then
    rojo "ngrok sin authtoken. Ejecuta: $NGROK_BIN config add-authtoken TU_TOKEN"
    exit 1
  fi
  URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.ngrok-free\.(dev|app)' | head -1 || true)
  if [[ -z "$URL" ]]; then
    azul "[3/3] Abriendo túnel ngrok (puerto 3000)..."
    nohup "$NGROK_BIN" http 3000 --log stdout > "$NGROK_LOG" 2>&1 &
    for i in $(seq 1 15); do
      URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.ngrok-free\.(dev|app)' | head -1 || true)
      [[ -n "$URL" ]] && break
      sleep 1
    done
  fi
  PANEL="Panel ngrok:     http://127.0.0.1:4040"
else
  # ---------- cloudflared (URL aleatoria trycloudflare.com, sin cuenta) ----------
  URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CLOUDFLARED_LOG" 2>/dev/null | head -1 || true)
  if [[ -z "$URL" ]] || ! curl -sf -o /dev/null "$URL/"; then
    pkill -f "[c]loudflared tunnel" 2>/dev/null || true
    azul "[3/3] Abriendo túnel cloudflared (puerto 3000)..."
    nohup "$CLOUDFLARED_BIN" tunnel --url "$APP_URL" --no-autoupdate > "$CLOUDFLARED_LOG" 2>&1 &
    for i in $(seq 1 20); do
      URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$CLOUDFLARED_LOG" 2>/dev/null | head -1 || true)
      [[ -n "$URL" ]] && break
      sleep 1
    done
  fi
  PANEL=""
fi

echo ""
verde "============================================"
if [[ -n "$URL" ]] && curl -sf -o /dev/null "$URL/"; then
  verde " DEPLOY COMPLETO"
  verde " URL pública: $URL"
else
  rojo " No se pudo abrir/verificar el túnel."
  azul "  Revisa: docker compose logs  |  cat $CLOUDFLARED_LOG"
  exit 1
fi
verde " Local:        $APP_URL"
[[ -n "$PANEL" ]] && verde "$PANEL"
verde " Logs:         docker compose logs -f"
verde " Detener todo: ./deploy.sh --stop"
verde "============================================"
