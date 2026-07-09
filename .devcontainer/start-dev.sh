#!/usr/bin/env bash
# Start the local (demo-test) dev servers for the WTMG dev container
# (postStartCommand). Runs on every container start.
#
# Steps:
#   1. Materialize .env / api/.env / .env.test.local from the container
#      environment via the repo's own ci/fill-envs.sh.
#   2. Apply the configured server ports (WTMG_PORT_*, default = standard) to
#      firebase.json and the generated .env, so the whole stack — emulators,
#      Vite and the browser-side emulator URLs — agrees on them.
#   3. (Re)launch a headless zellij session "dev" with two side-by-side panes:
#      "frontend" (Vite dev server) and "api" (Firebase demo emulators + seed).

set -euo pipefail

WORKSPACE_DIR="${WORKSPACE_DIR:-/root/welcometomygarden}"
SESSION="dev"
LAYOUT="$HOME/dev-layout.kdl"

# Server ports (default to the standard ports if the container env is unset).
PORT_FRONTEND="${WTMG_PORT_FRONTEND:-5173}"
PORT_HOSTING="${WTMG_PORT_HOSTING:-4000}"
PORT_EMU_UI="${WTMG_PORT_EMU_UI:-4001}"
PORT_FUNCTIONS="${WTMG_PORT_FUNCTIONS:-5001}"
PORT_FIRESTORE="${WTMG_PORT_FIRESTORE:-8080}"
PORT_AUTH="${WTMG_PORT_AUTH:-9099}"
PORT_STORAGE="${WTMG_PORT_STORAGE:-9199}"

if [ ! -e "$WORKSPACE_DIR/.git" ]; then
  echo "[start] No repo at $WORKSPACE_DIR yet — run bootstrap-repo.sh first." >&2
  exit 1
fi

cd "$WORKSPACE_DIR"

# 1. Fill env files from the injected environment (SENTRY_DSN, MAPBOX_ACCESS_TOKEN, ...).
echo "[start] Filling env files (ci/fill-envs.sh)..."
./ci/fill-envs.sh

# 2. Apply the configured ports. fill-envs.sh recreates .env fresh each run, so
#    these appends/edits are clean (no accumulation across restarts).
echo "[start] Applying server ports (frontend=$PORT_FRONTEND, firestore=$PORT_FIRESTORE, ...)..."

# 2a. Emulator ports in firebase.json (the emulators read them only from here).
WTMG_PORT_HOSTING="$PORT_HOSTING" WTMG_PORT_EMU_UI="$PORT_EMU_UI" \
WTMG_PORT_FUNCTIONS="$PORT_FUNCTIONS" WTMG_PORT_FIRESTORE="$PORT_FIRESTORE" \
WTMG_PORT_AUTH="$PORT_AUTH" WTMG_PORT_STORAGE="$PORT_STORAGE" \
node -e '
  const fs = require("fs");
  const j = JSON.parse(fs.readFileSync("firebase.json", "utf8"));
  const set = (key, env) => {
    const p = parseInt(process.env[env] || "", 10);
    if (j.emulators && j.emulators[key] && Number.isInteger(p)) j.emulators[key].port = p;
  };
  set("hosting", "WTMG_PORT_HOSTING");
  set("ui", "WTMG_PORT_EMU_UI");
  set("functions", "WTMG_PORT_FUNCTIONS");
  set("firestore", "WTMG_PORT_FIRESTORE");
  set("auth", "WTMG_PORT_AUTH");
  set("storage", "WTMG_PORT_STORAGE");
  fs.writeFileSync("firebase.json", JSON.stringify(j, null, 2) + "\n");
'

# 2b. Browser-facing emulator ports read by src/lib/api (firebase.ts, garden.ts).
{
  echo ""
  echo "# Dev container: browser-facing emulator ports (injected by start-dev.sh)"
  echo "VITE_EMULATOR_FIRESTORE_PORT=$PORT_FIRESTORE"
  echo "VITE_EMULATOR_AUTH_PORT=$PORT_AUTH"
  echo "VITE_EMULATOR_STORAGE_PORT=$PORT_STORAGE"
  echo "VITE_EMULATOR_FUNCTIONS_PORT=$PORT_FUNCTIONS"
} >> .env

# 2c. Align the emulator-host + frontend-URL vars with the shifted ports.
sed -i -E "s/^(FIRESTORE_EMULATOR_HOST=127\.0\.0\.1:)[0-9]+/\1$PORT_FIRESTORE/" .env
sed -i -E "s/^(FIREBASE_AUTH_EMULATOR_HOST=127\.0\.0\.1:)[0-9]+/\1$PORT_AUTH/" .env
sed -i -E "s#^(PUBLIC_WTMG_HOST=https?://localhost:)[0-9]+#\1$PORT_FRONTEND#" .env
sed -i -E "s#^(FRONTEND_URL=\"?https?://localhost:)[0-9]+#\1$PORT_FRONTEND#" api/.env

# 3. (Re)start the headless zellij dev session.
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
echo "  Frontend:      http://localhost:$PORT_FRONTEND"
echo "  Emulator UI:   http://localhost:$PORT_EMU_UI"
echo "  Logs:          ~/.logs/frontend.log  |  ~/.logs/api.log"
