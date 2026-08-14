#!/bin/bash
# Verifies that every variable listed under `# [required]` in
# ci/.env.local.example is present and non-empty in the environment.
#
# ci/fill-envs.sh substitutes empty values without complaining, so an unset
# secret might surface only later as an unexplained failure. This fails fast,
# naming the variables. It prints value lengths only.
#
# Usage: ci/check-envs.sh [context-hint]
#
# The hint is appended to the failure message. CI passes the repository the PR
# head comes from, because the most common cause there is a fork PR, which
# GitHub gives no secrets at all.

set -euo pipefail

cd "$(dirname "$0")/.."
example='ci/.env.local.example'

hint=${1-}
# Renders as an annotation in GitHub Actions, as noise anywhere else.
error_prefix=''
[ -n "${GITHUB_ACTIONS-}" ] && error_prefix='::error::'

# Assignments between the `# [required]` marker and the next `# [...]` marker.
# Anchored at the line start so commented-out duplicates (`#SOME_TOKEN=...`,
# which ci/.env.local files tend to accumulate) are not picked up.
required=$(awk '
  /^#[[:space:]]*\[required\][[:space:]]*$/ { inside = 1; next }
  /^#[[:space:]]*\[[a-z]+\][[:space:]]*$/   { inside = 0 }
  inside && /^[A-Za-z_][A-Za-z0-9_]*=/      { sub(/=.*/, ""); print }
' "$example")

# Without this, a renamed or typo'd marker would make the loop below check
# nothing at all and pass forever.
if [ -z "$required" ]; then
  echo "$error_prefix$example lists no variables under a '# [required]' line, so this check verified nothing — fix the markers in that file"
  exit 1
fi

# Likewise, a variable added above the first marker would go unchecked without
# anything looking wrong.
stray=$(awk '
  /^#[[:space:]]*\[[a-z]+\][[:space:]]*$/ { seen = 1 }
  !seen && /^[A-Za-z_][A-Za-z0-9_]*=/     { sub(/=.*/, ""); print }
' "$example")

if [ -n "$stray" ]; then
  echo "$error_prefix$example declares $(echo "$stray" | tr '\n' ' ')before its first '# [required]' / '# [optional]' marker, so it goes unchecked — move it under one"
  exit 1
fi

missing=''
for name in $required; do
  value=${!name-}
  printf '%s: %s chars\n' "$name" "${#value}"
  [ -n "$value" ] || missing="$missing $name"
done

if [ -n "$missing" ]; then
  message="empty:$missing"
  [ -n "$hint" ] && message="$message — expected if this is a pull_request from a fork ($hint), which GitHub gives no secrets"
  echo "$error_prefix$message"
  exit 1
fi
