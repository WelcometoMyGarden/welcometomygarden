#!/usr/bin/env bash
# Start the local (demo-test) dev servers for the WTMG dev container
# (postStartCommand). Runs on every container start.
#
# Steps:
#   1. Materialize .env / api/.env / .env.test.local from the container
#      environment via the repo's own ci/fill-envs.sh.
#   2. (Re)launch a headless zellij session "dev" with two side-by-side panes:
#      "frontend" (Vite dev server) and "api" (Firebase demo emulators + seed).

set -euo pipefail

WORKSPACE_DIR="${WORKSPACE_DIR:-/root/welcometomygarden}"
SESSION="dev"
LAYOUT="$HOME/dev-layout.kdl"

if [ ! -e "$WORKSPACE_DIR/.git" ]; then
  echo "[start] No repo at $WORKSPACE_DIR yet — run bootstrap-repo.sh first." >&2
  exit 1
fi

cd "$WORKSPACE_DIR"

# 1. Fill env files from the injected environment (SENTRY_DSN, MAPBOX_ACCESS_TOKEN, ...).
echo "[start] Filling env files (ci/fill-envs.sh)..."
./ci/fill-envs.sh

# 2. (Re)start the headless zellij dev session.
# Query the session directly; `list-sessions` output is ANSI-colored and also
# lists exited sessions.
if zellij --session "$SESSION" action list-panes >/dev/null 2>&1; then
  echo "[start] zellij session '$SESSION' already running — leaving it as is."
else
  echo "[start] Launching zellij session '$SESSION' (frontend + api)..."
  # A previously-exited session lingers and would be resurrected with its old
  # layout by --create-background; clear it first.
  zellij delete-session "$SESSION" --force >/dev/null 2>&1 || true
  zellij attach --create-background "$SESSION" options --default-layout "$LAYOUT"
fi

echo ""
echo "[start] Dev session started."
echo "  Attach:        zellij attach $SESSION"
echo "  Frontend:      http://localhost:5173"
echo "  Emulator UI:   http://localhost:4001"
echo "  Logs:          ~/.logs/frontend.log  |  ~/.logs/api.log"
