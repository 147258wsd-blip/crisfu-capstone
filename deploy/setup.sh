#!/usr/bin/env bash
# Cris Fu Capstone — one-shot deploy for a fresh Ubuntu/Debian server.
#
#   bash setup.sh [/path/to/crisfu.env]
#
# Expects the repo already unpacked at /opt/crisfu (see DEPLOY.md).
# Safe to re-run: it re-installs nothing that is already present and
# restarts the API instead of spawning a second copy.
#
# What it does
#   1. base packages (curl, git, nginx)
#   2. Node.js 20 — NodeSource, falling back to the npmmirror tarball
#   3. pm2, so the API survives a reboot
#   4. server deps + .env hygiene (strips Windows-only DNS_SERVERS, CRLF)
#   5. frontend build, pointed at the same origin (/api) so CORS is moot
#   6. nginx: static SPA + reverse proxy for /api
#   7. a live smoke test and the two URLs to hand in

set -euo pipefail

APP_DIR=/opt/crisfu
ENV_SRC="${1:-}"
REGISTRY=https://registry.npmmirror.com

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mxx  %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run as root: sudo bash setup.sh"
[ -d "$APP_DIR/server" ] || die "$APP_DIR/server not found — unpack the archive into $APP_DIR"

export DEBIAN_FRONTEND=noninteractive

# ---------------------------------------------------------------- 1. packages
log "installing base packages"
apt-get update -y -qq
apt-get install -y -qq curl ca-certificates git nginx >/dev/null

# 2 GB of swap — a 2-core/2 GB box builds Vite uncomfortably close to the
# ceiling, and an OOM kill mid-build is a confusing failure to debug.
if [ ! -f /swapfile ]; then
  log "adding 2 GB of swap (the build can exhaust 2 GB of RAM)"
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------------------------------------------------------------- 2. node
need_node=1
if command -v node >/dev/null 2>&1; then
  major=$(node -p 'process.versions.node.split(".")[0]')
  # an `if`, not `[ ... ] && ...` — under `set -e` a false test would abort the run
  if [ "$major" -ge 18 ]; then need_node=0; fi
fi

if [ "$need_node" -eq 1 ]; then
  log "installing Node.js 20"
  if ! curl -fsSL --max-time 30 https://deb.nodesource.com/setup_20.x -o /tmp/nodesource.sh; then
    warn "NodeSource unreachable, falling back to npmmirror binaries"
    NODE_VER=v20.18.1
    curl -fsSL --max-time 180 \
      "https://npmmirror.com/mirrors/node/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz" \
      -o /tmp/node.tar.xz
    tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1
    ln -sf /usr/local/bin/node /usr/bin/node
    ln -sf /usr/local/bin/npm /usr/bin/npm
  else
    bash /tmp/nodesource.sh >/dev/null
    apt-get install -y -qq nodejs >/dev/null
  fi
fi
log "node $(node -v) / npm $(npm -v)"

# ---------------------------------------------------------------- 3. pm2
if ! command -v pm2 >/dev/null 2>&1; then
  log "installing pm2"
  npm i -g pm2 --registry=$REGISTRY --silent
fi

# ---------------------------------------------------------------- 4. backend
log "installing API dependencies"
cd "$APP_DIR/server"
npm ci --omit=dev --registry=$REGISTRY --silent

if [ -n "$ENV_SRC" ] && [ -f "$ENV_SRC" ]; then
  log "writing .env (from $ENV_SRC）"
  cp "$ENV_SRC" "$APP_DIR/server/.env"
fi

if [ ! -f "$APP_DIR/server/.env" ]; then
  die "missing $APP_DIR/server/.env — upload it, or copy .env.example and fill in MONGODB_URI / JWT_SECRET"
fi

# a .env written on Windows carries CRLF and a DNS override that only helps there
sed -i 's/\r$//' "$APP_DIR/server/.env"
sed -i '/^DNS_SERVERS=/d' "$APP_DIR/server/.env"
grep -q '^NODE_ENV=' "$APP_DIR/server/.env" && sed -i 's/^NODE_ENV=.*/NODE_ENV=production/' "$APP_DIR/server/.env" \
  || echo 'NODE_ENV=production' >> "$APP_DIR/server/.env"
grep -q '^PORT=' "$APP_DIR/server/.env" && sed -i 's/^PORT=.*/PORT=5000/' "$APP_DIR/server/.env" \
  || echo 'PORT=5000' >> "$APP_DIR/server/.env"

grep -q '^MONGODB_URI=mongodb' "$APP_DIR/server/.env" || die "MONGODB_URI in .env does not look right"
grep -q 'crisfu' "$APP_DIR/server/.env" || warn "MONGODB_URI  seems to lack the /crisfu database name — data would land in the test database"

log "starting the API (pm2)"
pm2 delete crisfu-api >/dev/null 2>&1 || true
pm2 start server.js --name crisfu-api --update-env >/dev/null
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ---------------------------------------------------------------- 5. frontend
log "building the client"
cd "$APP_DIR/cris-react"
cat > .env.production <<'EOF'
VITE_USE_MOCK=false
VITE_API_URL=/api
EOF
npm ci --registry=$REGISTRY --silent
npm run build 2>&1 | tail -4

# ---------------------------------------------------------------- 6. nginx
log "configuring nginx"
cat > /etc/nginx/sites-available/crisfu <<'NGINX'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /opt/crisfu/cris-react/dist;
    index index.html;

    # API first — otherwise the SPA fallback would swallow /api/*
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /assets/ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/crisfu /etc/nginx/sites-enabled/crisfu
rm -f /etc/nginx/sites-enabled/default
nginx -t >/dev/null 2>&1 || die "nginx config check failed — run nginx -t for details"
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx

# ---------------------------------------------------------------- 7. verify
log "waiting for the API"
for i in $(seq 1 20); do
  if curl -fsS --max-time 2 http://127.0.0.1:5000/api/health >/dev/null 2>&1; then break; fi
  sleep 1
done

health=$(curl -fsS --max-time 5 http://127.0.0.1:5000/api/health 2>/dev/null || echo "")
page=$(curl -fsS -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1/ 2>/dev/null || echo "000")

IP=$(curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo
printf '=%.0s' {1..60}; echo
if [ -n "$health" ]; then
  echo "  API    http://$IP/api"
  echo "  $health"
else
  warn "API did not respond — see the logs: pm2 logs crisfu-api --lines 40"
fi
echo "  Site   http://$IP/          (HTTP $page)"
printf '=%.0s' {1..60}; echo
echo
echo "useful commands:"
echo "  pm2 logs crisfu-api        API logs"
echo "  pm2 restart crisfu-api     after changing .env"
echo "  systemctl reload nginx     after changing nginx config"
