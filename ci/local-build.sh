#!/bin/bash
# Convenience script to build the CI E2E image
cd $(dirname $0)/..
docker buildx build . \
  -f ci/Dockerfile.ci \
  -t wtmg-e2e-ci:24 \
  -t wtmg-e2e-ci:latest
docker buildx build . \
  -f ci/Dockerfile.local-test \
  -t wtmg-e2e-local:24 \
  -t wtmg-e2e-local:latest
cd -
