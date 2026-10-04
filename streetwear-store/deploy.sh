#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  One-command deploy for a fresh Ubuntu VPS (22.04 / 24.04).
#
#  Option A – project already on the server (scp/rsync/git clone), run inside it:
#      sudo bash deploy.sh
#  Option B – let the script clone it:
#      curl -fsSL <raw-url-of-deploy.sh> -o deploy.sh
#      sudo REPO_URL=https://github.com/<you>/<repo>.git REPO_SUBDIR=streetwear-store bash deploy.sh
#
#  Env options:  APP_DIR (default /opt/streetwear-store)  BRANCH (default: repo default)
#                SITE_URL (default http://<public-ip>)    SEED=true|false (default true on first install)
#                ADMIN_EMAIL (default admin@example.com)
#  Re-running the script updates the code and restarts the stack; .env and data are kept.
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/streetwear-store}"
REPO_URL="${REPO_URL:-}"
REPO_SUBDIR="${REPO_SUBDIR:-}"
BRANCH="${BRANCH:-}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mERROR:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run as root: sudo bash deploy.sh"

# ── 1. System packages & Docker ─────────────────────────────────────────────
log "Installing base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git openssl rsync

if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"

# ── 2. Code ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$REPO_URL" ]; then
  SRC_DIR="/opt/src-$(basename "$APP_DIR")"
  if [ -d "$SRC_DIR/.git" ]; then
    log "Updating repository in $SRC_DIR"
    git -C "$SRC_DIR" fetch --all --prune
    git -C "$SRC_DIR" reset --hard "origin/${BRANCH:-$(git -C "$SRC_DIR" rev-parse --abbrev-ref HEAD)}"
  else
    log "Cloning $REPO_URL"
    git clone ${BRANCH:+--branch "$BRANCH"} "$REPO_URL" "$SRC_DIR"
  fi
  SRC_DIR="$SRC_DIR/${REPO_SUBDIR}"
elif [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
  SRC_DIR="$SCRIPT_DIR"
else
  die "Run this script from the project folder, or set REPO_URL (and REPO_SUBDIR if the app is in a subfolder)."
fi
[ -f "$SRC_DIR/docker-compose.yml" ] || die "docker-compose.yml not found in $SRC_DIR"

if [ "$(realpath "$SRC_DIR")" != "$(realpath -m "$APP_DIR")" ]; then
  log "Copying project to $APP_DIR"
  mkdir -p "$APP_DIR"
  rsync -a --delete --exclude .env --exclude node_modules --exclude .next --exclude uploads "$SRC_DIR/" "$APP_DIR/"
fi
cd "$APP_DIR"

# ── 3. Environment (.env) ───────────────────────────────────────────────────
FIRST_INSTALL=false
if [ ! -f .env ]; then
  FIRST_INSTALL=true
  log "Creating .env with generated secrets"
  PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')"
  SITE_URL="${SITE_URL:-http://$PUBLIC_IP}"
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
  ADMIN_PASSWORD="$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)"
  cp .env.example .env
  set_env() { # key value
    local v; v=$(printf '%s' "$2" | sed -e 's/[\/&|]/\\&/g')
    if grep -q "^$1=" .env; then sed -i "s|^$1=.*|$1=\"$v\"|" .env; else echo "$1=\"$2\"" >> .env; fi
  }
  set_env SITE_URL "$SITE_URL"
  set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
  set_env SESSION_SECRET "$(openssl rand -hex 32)"
  set_env ADMIN_EMAIL "$ADMIN_EMAIL"
  set_env ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_env SEED_ON_START "false"
  chmod 600 .env
fi

# ── 4. Firewall ─────────────────────────────────────────────────────────────
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  log "Opening ports 80/443 in ufw"
  ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
fi

# ── 5. Build & start (schema sync runs automatically in the app entrypoint) ──
log "Building and starting containers (first build takes a few minutes)"
docker compose up -d --build --remove-orphans

log "Waiting for the app to become healthy"
for i in $(seq 1 60); do
  if curl -fsS -o /dev/null http://127.0.0.1/api/health; then break; fi
  [ "$i" -eq 60 ] && { docker compose logs --tail=80 app; die "App did not become healthy"; }
  sleep 5
done

# ── 6. Seed placeholder catalog (first install only, unless SEED=false) ─────
if [ "${SEED:-$FIRST_INSTALL}" = "true" ]; then
  log "Seeding placeholder products"
  docker compose exec -T app node_modules/.bin/tsx prisma/seed.ts
fi

SITE_URL_NOW="$(grep '^SITE_URL=' .env | cut -d= -f2- | tr -d '"')"
log "Done!"
echo "  Store:  $SITE_URL_NOW"
echo "  Admin:  $SITE_URL_NOW/admin"
if [ "$FIRST_INSTALL" = "true" ]; then
  echo "  Admin login: $(grep '^ADMIN_EMAIL=' .env | cut -d= -f2- | tr -d '"') / $ADMIN_PASSWORD"
  echo "  ⚠  Save this password now and change it after the first login (Admin → Settings)."
fi
echo "  Next steps: add Stripe keys + SMTP to $APP_DIR/.env, then: cd $APP_DIR && docker compose up -d"
