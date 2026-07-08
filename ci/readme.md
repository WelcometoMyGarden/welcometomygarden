This folder primarily contains the [Dockerfile](./Dockerfile.ci) that defines the full-stack environment in which GitHub's CI runs Playwright e2e tests.

## Local E2E tests in a CI container

The same environment can also be used to E2E locally in an isolated environment, when combined with [Dockerfile.local-test](./Dockerfile.local-test).

This may be useful to test the effect of front-end and/or back-end dependency updates and configuration changes, especially:

- When simulatenously working on another feature on the host, delegating the E2E test of code snapshot (docker `COPY`) makes it run in parallel to local host development servers.
- For configuration changes that may be dependent somehow on the host system, in which the container is a neutral/fresh environment without access to most credentials.

To use it, run:

```sh
./ci/local-build.sh && ./ci/local-run.sh
```

The build script will at first build the base build container (`Dockerfile.ci`), which is not dependent on local repo files. This container should be cached for subsequent runs.

Next, `Dockerfile.local-test` will `COPY` essential source files and config into the container, and will then install dependencies. **This process should be rerun after a code change**.

The local-run script will run the container, which fills in environment variables based on a fixed mapping and env file given. Then it builds the front-end, and runs the tests (which also runs the backend).

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
