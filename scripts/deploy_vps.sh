#!/usr/bin/env bash
set -euo pipefail

# FinBR VPS deploy helper
# Usage:
#   scripts/deploy_vps.sh
#   VPS_HOST=ubuntu@187.84.150.128 scripts/deploy_vps.sh
#   VPS_APP_DIR=~/Finan-asPro VPS_PREFERRED_PORTS="43991 43992 44001" scripts/deploy_vps.sh

VPS_HOST="${VPS_HOST:-ubuntu@187.84.150.128}"
VPS_APP_DIR="${VPS_APP_DIR:-~/Finan-asPro}"
VPS_REPO_URL="${VPS_REPO_URL:-https://github.com/daminebenq/Finan-asPro.git}"
VPS_BRANCH="${VPS_BRANCH:-main}"
VPS_PREFERRED_PORTS="${VPS_PREFERRED_PORTS:-43991 43992 43993 43994 43995 44001 44011 44021}"

# shellcheck disable=SC2029
ssh "$VPS_HOST" "bash -s" <<EOF
set -euo pipefail

APP_DIR="$VPS_APP_DIR"
REPO_URL="$VPS_REPO_URL"
BRANCH="$VPS_BRANCH"
PREFERRED_PORTS="$VPS_PREFERRED_PORTS"

if [ -d "\$APP_DIR/.git" ]; then
  cd "\$APP_DIR"
  git fetch origin
  git checkout "\$BRANCH"
  git pull origin "\$BRANCH"
else
  rm -rf "\$APP_DIR"
  git clone -b "\$BRANCH" "\$REPO_URL" "\$APP_DIR"
  cd "\$APP_DIR"
fi

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: Neither docker-compose nor docker compose is available on VPS."
  exit 1
fi

FREE_PORT=""
for p in \$PREFERRED_PORTS; do
  if ! ss -ltn | awk '{print \$4}' | grep -q ":\${p}\$"; then
    FREE_PORT="\$p"
    break
  fi
done

if [ -z "\$FREE_PORT" ]; then
  echo "ERROR: no free port found in VPS_PREFERRED_PORTS: \$PREFERRED_PORTS"
  exit 1
fi

export HOST_PORT="\$FREE_PORT"

\$COMPOSE_CMD down || true
\$COMPOSE_CMD up -d --build
\$COMPOSE_CMD ps

echo "DEPLOYED_PORT=\$FREE_PORT"
EOF
