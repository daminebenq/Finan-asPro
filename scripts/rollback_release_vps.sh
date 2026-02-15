#!/usr/bin/env bash
set -euo pipefail

# Roll back VPS deployment to previously promoted release.
#
# Usage:
#   scripts/rollback_release_vps.sh
#   VPS_HOST=ubuntu@1.2.3.4 scripts/rollback_release_vps.sh

VPS_HOST="${VPS_HOST:-ubuntu@187.84.150.128}"
VPS_APP_DIR="${VPS_APP_DIR:-~/Finan-asPro}"
VPS_BRANCH="${VPS_BRANCH:-main}"
VPS_PREFERRED_PORTS="${VPS_PREFERRED_PORTS:-43991 43992 43993 43994 43995 44001 44011 44021}"

# shellcheck disable=SC2029
ssh "$VPS_HOST" "bash -s" <<EOF
set -euo pipefail

APP_DIR="$VPS_APP_DIR"
BRANCH="$VPS_BRANCH"
PREFERRED_PORTS="$VPS_PREFERRED_PORTS"
RELEASE_DIR_NAME=".release"

case "\$APP_DIR" in
  "~/"*) APP_DIR="\$HOME/\${APP_DIR#~/}" ;;
  "~") APP_DIR="\$HOME" ;;
esac

cd "\$APP_DIR"
git fetch --all --tags --prune

if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  echo "ERROR: Neither docker-compose nor docker compose is available on VPS."
  exit 1
fi

CURRENT_FILE="\$APP_DIR/\$RELEASE_DIR_NAME/current.env"
PREVIOUS_FILE="\$APP_DIR/\$RELEASE_DIR_NAME/previous.env"
TMP_FILE="\$APP_DIR/\$RELEASE_DIR_NAME/current.before_rollback.env"

if [ ! -f "\$PREVIOUS_FILE" ]; then
  echo "ERROR: rollback metadata not found: \$PREVIOUS_FILE"
  exit 1
fi

if [ -f "\$CURRENT_FILE" ]; then
  cp "\$CURRENT_FILE" "\$TMP_FILE"
fi

set -a
# shellcheck disable=SC1090
. "\$PREVIOUS_FILE"
set +a

if [ -z "\${COMMIT:-}" ]; then
  echo "ERROR: previous release metadata missing COMMIT"
  exit 1
fi

ROLLBACK_COMMIT="\$COMMIT"
ROLLBACK_PORT="\${PORT:-}"

git checkout --detach "\$ROLLBACK_COMMIT"

TARGET_PORT="\$ROLLBACK_PORT"
if [ -z "\$TARGET_PORT" ]; then
  for p in \$PREFERRED_PORTS; do
    if ! ss -ltn | awk '{print \$4}' | grep -q ":\${p}\$"; then
      TARGET_PORT="\$p"
      break
    fi
  done
fi

if [ -z "\$TARGET_PORT" ]; then
  echo "ERROR: no port available for rollback"
  exit 1
fi

export HOST_PORT="\$TARGET_PORT"

\$COMPOSE_CMD down || true
\$COMPOSE_CMD up -d --build
\$COMPOSE_CMD ps

if ! curl -fsS "http://127.0.0.1:\$TARGET_PORT" >/dev/null; then
  echo "ERROR: health check failed after rollback on port \$TARGET_PORT"
  exit 1
fi

cat > "\$CURRENT_FILE" <<EOCUR
COMMIT=\$ROLLBACK_COMMIT
PORT=\$TARGET_PORT
REF=rollback
DEPLOYED_AT=\$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOCUR

if [ -f "\$TMP_FILE" ]; then
  mv "\$TMP_FILE" "\$PREVIOUS_FILE"
fi

echo "ROLLBACK_OK"
echo "COMMIT=\$ROLLBACK_COMMIT"
echo "PORT=\$TARGET_PORT"
echo "STATE_CURRENT=\$CURRENT_FILE"
echo "STATE_PREVIOUS=\$PREVIOUS_FILE"
EOF
