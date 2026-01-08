cd $(dirname $0)/..
docker buildx build . \
  -f ci/Dockerfile.ci \
  -t wtmg-e2e-ci:latest
docker buildx build . \
  -f ci/Dockerfile.local \
  -t wtmg-e2e-local:latest
cd -
