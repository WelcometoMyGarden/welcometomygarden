#!/bin/bash
# Convenience script to build the CI E2E image
# --only-base: skip the local-test build and only build the Dockerfile.ci base image

only_base=false
for arg in "$@"; do
  case "$arg" in
    --only-base) only_base=true ;;
  esac
done

cd $(dirname $0)/..
docker buildx build . \
  -f ci/Dockerfile.ci \
  -t wtmg-e2e-ci:24 \
  -t wtmg-e2e-ci:latest
if [ "$only_base" = false ]; then
  docker buildx build . \
    -f ci/Dockerfile.local-test \
    -t wtmg-e2e-local:24 \
    -t wtmg-e2e-local:latest
fi
cd -
