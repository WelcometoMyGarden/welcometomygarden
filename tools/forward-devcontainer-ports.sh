#!/bin/bash
# Forward the WTMG devcontainer ports from this machine's localhost to a remote
# SSH host running the devcontainer, so its services are reachable locally at
# http://localhost:<port> (then there is no need to add the remote's IP
# to the remote devcontainer's Vite's allowed hosts).
#
# Ports are the WTMG_PORT_* values from .devcontainer/.env.compose, falling back
# to the defaults in .devcontainer/docker-compose.yml. Each local port maps to
# the same port on the remote's localhost, where docker publishes the container.
#
# Usage: tools/forward-devcontainer-ports.sh <ssh-host> [extra ssh args...]
# Stop with Ctrl-C.
set -euo pipefail

if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
  echo "Usage: $0 <ssh-host> [extra ssh args...]" >&2
  exit 1
fi

host="$1"
shift

env_file="$(cd "$(dirname "$0")/.." && pwd)/.devcontainer/.env.compose"

# name:default pairs, matching .devcontainer/docker-compose.yml
ports_spec="
FRONTEND:5173
HOSTING:4000
EMU_UI:4001
FUNCTIONS:5001
FIRESTORE:8080
AUTH:9099
STORAGE:9199
"

# Read KEY's value from the env file (last assignment wins), stripping quotes,
# a leading `export` and trailing comments.
read_env() {
  [ -f "$env_file" ] || return 0
  sed -nE "s/^[[:space:]]*(export[[:space:]]+)?$1[[:space:]]*=[[:space:]]*['\"]?([0-9]+)['\"]?.*$/\2/p" "$env_file" | tail -n 1
}

forwards=()
for entry in $ports_spec; do
  name="${entry%%:*}"
  port="$(read_env "WTMG_PORT_$name")"
  port="${port:-${entry##*:}}"
  forwards+=(-L "$port:localhost:$port")
  printf '  %-10s localhost:%s\n' "$name" "$port"
done

[ -f "$env_file" ] || echo "Note: $env_file not found, using defaults." >&2
echo "Forwarding the ports above to $host (Ctrl-C to stop)..."

exec ssh -N -o ExitOnForwardFailure=yes "${forwards[@]}" "$@" "$host"
