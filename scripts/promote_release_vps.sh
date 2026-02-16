#!/usr/bin/env bash
set -euo pipefail

# Promote a release on VPS by deploying a specific git ref/commit with Docker Compose.
#
# Usage:
#   scripts/promote_release_vps.sh
#   RELEASE_REF=origin/main scripts/promote_release_vps.sh
#   RELEASE_REF=<commit_sha> VPS_HOST=ubuntu@1.2.3.4 scripts/promote_release_vps.sh

VPS_HOST="${VPS_HOST:-ubuntu@187.84.150.128}"
VPS_APP_DIR="${VPS_APP_DIR:-~/Finan-asPro}"
VPS_REPO_URL="${VPS_REPO_URL:-https://github.com/daminebenq/Finan-asPro.git}"
VPS_BRANCH="${VPS_BRANCH:-main}"
RELEASE_REF="${RELEASE_REF:-origin/main}"
VPS_PREFERRED_PORTS="${VPS_PREFERRED_PORTS:-43991 43992 43993 43994 43995 44001 44011 44021}"

# shellcheck disable=SC2029
ssh "$VPS_HOST" "bash -s" <<EOF
set -euo pipefail

APP_DIR="$VPS_APP_DIR"
REPO_URL="$VPS_REPO_URL"
BRANCH="$VPS_BRANCH"
TARGET_REF="$RELEASE_REF"
PREFERRED_PORTS="$VPS_PREFERRED_PORTS"
RELEASE_DIR_NAME=".release"

case "\$APP_DIR" in
  ~/*) APP_DIR="\$HOME/\${APP_DIR#~/}" ;;
  ~) APP_DIR="\$HOME" ;;
esac

if [ -d "\$APP_DIR/.git" ]; then
  cd "\$APP_DIR"
  git fetch --all --tags --prune
else
  rm -rf "\$APP_DIR"
  git clone -b "\$BRANCH" "\$REPO_URL" "\$APP_DIR"
  cd "\$APP_DIR"
  git fetch --all --tags --prune
fi

ENV_DEPLOY_FILE="\$APP_DIR/.env.deploy"
if [ -f "\$ENV_DEPLOY_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "\$ENV_DEPLOY_FILE"
  set +a
  echo "INFO: Loaded deploy environment from \$ENV_DEPLOY_FILE"
else
  echo "WARN: \$ENV_DEPLOY_FILE not found. Build-time VITE variables may be missing."
fi

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: Neither docker-compose nor docker compose is available on VPS."
  exit 1
fi

TARGET_COMMIT="\$(git rev-parse "\$TARGET_REF")"
ACTIVE_COMMIT="\$(git rev-parse HEAD || true)"

mkdir -p "\$APP_DIR/\$RELEASE_DIR_NAME"
CURRENT_FILE="\$APP_DIR/\$RELEASE_DIR_NAME/current.env"
PREVIOUS_FILE="\$APP_DIR/\$RELEASE_DIR_NAME/previous.env"

ACTIVE_PORT=""
if [ -f "\$CURRENT_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "\$CURRENT_FILE"
  set +a
  ACTIVE_PORT="\${PORT:-}"
fi

if [ "\$TARGET_COMMIT" = "\$ACTIVE_COMMIT" ]; then
  echo "INFO: Target commit already active (\$TARGET_COMMIT). Re-deploying for consistency."
fi

git checkout --detach "\$TARGET_COMMIT"

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

HEALTH_OK=0
for i in \$(seq 1 20); do
  if curl -fsS "http://127.0.0.1:\$FREE_PORT" >/dev/null; then
    HEALTH_OK=1
    break
  fi
  sleep 1
done

if [ "\$HEALTH_OK" -ne 1 ]; then
  echo "ERROR: health check failed after promote on port \$FREE_PORT"
  exit 1
fi

if [ -f "\$CURRENT_FILE" ]; then
  cp "\$CURRENT_FILE" "\$PREVIOUS_FILE"
else
  cat > "\$PREVIOUS_FILE" <<EOPREV
COMMIT=\$ACTIVE_COMMIT
PORT=\$ACTIVE_PORT
REF=active-before-promote
DEPLOYED_AT=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOPREV
fi

cat > "\$CURRENT_FILE" <<EOCUR
COMMIT=\$TARGET_COMMIT
PORT=\$FREE_PORT
REF=\$TARGET_REF
DEPLOYED_AT=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOCUR

echo "PROMOTE_OK"
echo "COMMIT=\$TARGET_COMMIT"
echo "PORT=\$FREE_PORT"
echo "STATE_CURRENT=\$CURRENT_FILE"
echo "STATE_PREVIOUS=\$PREVIOUS_FILE"
EOF
