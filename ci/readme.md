## Deployment

These can be deployed locally too via the docker CLI, using a GitHub Personal Access Token (classic).

See [authentication docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-to-the-container-registry)

Then build for amd64 (used by default by GitHub Actions), and push a specific version.

```sh
# Build
docker buildx build . \
--platform linux/amd64 \
-f ci/Dockerfile.ci \
-t ghcr.io/welcometomygarden/wtmg-e2e-ci:24

# Push
docker push ghcr.io/welcometomygarden/wtmg-e2e-ci:24
```
