#!/bin/bash
# Fills in environment values from the environment into the .env files frontend, backend & testing
# Expected input env variables:
# - SENTRY_DSN
# - SENTRY_AUTH_TOKEN
# - MAPBOX_ACCESS_TOKEN
# - THUNDERFOREST_API_KEY
# - STRIPE_PUBLISHABLE_KEY

SENTRY_HOST=$(echo $SENTRY_DSN | sed -E 's#^[a-zA-Z]+://([^@]+)?@?([^/]+).*#\2#')
GLITCHTIP_KEY=$(echo $SENTRY_DSN | sed -E 's#^[a-zA-Z]+://([^@]+)?@?([^/]+).*#\1#')

# $1: template name
# $2: target path
fill_envs() {
  cp ci/env-templates/$1.env $2
  placeholders=$(grep -oE '\$\{[^}]+\}' $2 | sort | uniq)
  for placeholder in $placeholders; do
    # escaping for sed replacements
    escaped_key=$(printf '%s\n' "$placeholder" | sed 's/[\/&]/\\&/g')
    escaped_value=$(printf '%s\n' "$(eval "echo $placeholder")" | sed 's/[\/&]/\\&/g')
    echo Replacing $escaped_key
    if [[ $(uname) == Darwin ]]; then
        SP=" " # Needed for portability with gnu sed
    fi
    # Assumes that placeholders are of the format ${MY_VARIABLE}
    sed -i${SP}'' -e "s/$escaped_key/$escaped_value/g" $2
  done
}

fill_envs frontend .env
fill_envs backend api/.env
fill_envs test .env.test.local
