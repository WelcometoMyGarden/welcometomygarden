#!/usr/bin/env bash
# One-off repo bootstrap for the WTMG dev container (postCreateCommand).
#
# Clones the WTMG repo into the named volume mounted at $WORKSPACE_DIR, then
# installs dependencies. Idempotent: postCreateCommand also runs again after a
# rebuild, so an existing working copy in the volume is left completely
# untouched — this never re-clones or overwrites it.
#
# Environment (all optional, supplied via docker-compose env_file .env.local):
#   REPO_URL     git HTTPS URL to clone (default: the public WTMG repo)
#   GITHUB_PAT   token injected into a github.com URL for private/rate-limited access
#   REPO_BRANCH  branch to check out (default: the remote's default branch)

set -euo pipefail

WORKSPACE_DIR="${WORKSPACE_DIR:-/root/welcometomygarden}"
REPO_URL="${REPO_URL:-https://github.com/WelcometoMyGarden/welcometomygarden.git}"
REPO_BRANCH="${REPO_BRANCH:-}"
GITHUB_PAT="${GITHUB_PAT:-}"

# Inject the PAT into a github.com HTTPS URL when one is provided. Non-github or
# already-credentialed URLs pass through unchanged.
inject_pat() {
  local url="$1"
  if [ -n "$GITHUB_PAT" ] && [[ "$url" == https://github.com/* ]]; then
    printf 'https://x-access-token:%s@github.com/%s' "$GITHUB_PAT" "${url#https://github.com/}"
  else
    printf '%s' "$url"
  fi
}

if [ -e "$WORKSPACE_DIR/.git" ]; then
  echo "[bootstrap] Repo already present at $WORKSPACE_DIR — leaving the working copy untouched."
else
  clone_url="$(inject_pat "$REPO_URL")"
  # Log only the clean URL so a token never lands in console output.
  echo "[bootstrap] Cloning $REPO_URL into $WORKSPACE_DIR ..."
  if [ -n "$REPO_BRANCH" ]; then
    git clone --branch "$REPO_BRANCH" "$clone_url" "$WORKSPACE_DIR"
  else
    git clone "$clone_url" "$WORKSPACE_DIR"
  fi
  echo "[bootstrap] Clone complete."
fi

cd "$WORKSPACE_DIR"
git remote set-url origin "$(inject_pat "$REPO_URL")"

# Non-logged-in demo emulator projects can't load extensions, so strip the
# storage-resize-images extension from firebase.json (same fix as
# ci/Dockerfile.local-test). Idempotent: a no-op once removed.
if grep -q '"extensions"' firebase.json 2>/dev/null; then
  echo "[bootstrap] Removing extensions block from firebase.json (demo emulators)..."
  sed -i -z 's/,\n[[:space:]]*"extensions": {\n[[:space:]]*"storage-resize-images": "firebase\/storage-resize-images@[0-9]\+\.[0-9]\+\.[0-9]\+"\n[[:space:]]*}\n//g' firebase.json
fi

# Public static assets required by the source (src/lib/assets is gitignored, so
# a fresh clone lacks them). Fetched anonymously from the public GCS bucket,
# mirroring the CI e2e workflow. Idempotent: skip if already populated.
if [ -d src/lib/assets ] && [ -n "$(ls -A src/lib/assets 2>/dev/null)" ]; then
  echo "[bootstrap] src/lib/assets already present — skipping asset download."
else
  echo "[bootstrap] Downloading public assets from gs://wtmg-static/assets ..."
  gsutil -m cp -r gs://wtmg-static/assets src/lib
fi

# Dependencies (frontend + api) via corepack-managed yarn.
echo "[bootstrap] Installing frontend dependencies..."
corepack prepare --activate
yarn install --immutable
echo "[bootstrap] Installing api dependencies..."
( cd api && yarn install --immutable )

echo "[bootstrap] Done. Dev servers are started by start-dev.sh (postStartCommand)."
