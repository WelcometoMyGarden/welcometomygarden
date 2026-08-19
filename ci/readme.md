This folder primarily contains the [Dockerfile](./Dockerfile.ci) that defines the full-stack environment in which GitHub's CI runs Playwright e2e tests.

## Local E2E tests in a CI container

The same environment can also be used to E2E locally in an isolated environment, when combined with [Dockerfile.local-test](./Dockerfile.local-test).

This may be useful to test the effect of front-end and/or back-end dependency updates and configuration changes, especially:

- When simulatenously working on another feature on the host, delegating the E2E test of code snapshot (docker `COPY`) makes it run in parallel to local host development servers.
- For configuration changes that may be dependent somehow on the host system, in which the container is a neutral/fresh environment without access to most credentials.

To use it, make a local copy of the required environment variables, and fill them.

```sh
cp ci/.env.local.example ci/.env.local
```

Then run:

```sh
./ci/local-build.sh && ./ci/local-run.sh
```

The build script will at first build the base build container (`Dockerfile.ci`), which is not dependent on local repo files. This container should be cached for subsequent runs.

Next, `Dockerfile.local-test` will `COPY` essential source files and config into the container, and will then install dependencies. **This process should be rerun after a code change**.

The local-run script will run the container, which fills in environment variables based on a fixed mapping and env file given. Then it builds the front-end, and runs the tests (which also runs the backend).

## Publishing

The published image is `ghcr.io/welcometomygarden/wtmg-e2e-ci:24-trixie`, a
multi-arch (amd64 + arm64) manifest list. The tag encodes the base image in
`Dockerfile.ci`: Node major + Debian codename.

The normal way to publish is
[`.github/workflows/build-ci-e2e-image.yml`](../.github/workflows/build-ci-e2e-image.yml),
which builds each architecture on a native runner and merges the results. It
runs **only on a push to the `ci-image-build` branch**, or via a manual
`workflow_dispatch` — never on `master`:

```sh
git push -f origin HEAD:ci-image-build
```

Note that `workflow_dispatch` only appears in the Actions UI once the workflow
file is on the default branch; the branch push trigger works right away.

Publish a new image before referencing it in other pushed actions or pull requests.

### Bumping the tag

Consumers pin the tag explicitly, so a new tag has to be rolled out by hand.
When changing the Node major or the Debian release, update `VERSION` in the
build workflow and then all consumers:

- `.github/workflows/test-e2e-emulators.yml` (`container.image`)
- `.devcontainer/Dockerfile` (`ARG BASE_IMAGE`) and `.devcontainer/docker-compose.yml`
- `ci/local-build.sh` and `ci/Dockerfile.local-test` (local tags)
- the readmes here and in `.devcontainer/`

### Publishing by hand

Possible via the docker CLI with a GitHub Personal Access Token (classic) — see the
[authentication docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-to-the-container-registry).

Note that multi-arch requires the `docker-container` buildx driver and `--push`
(the default `docker` driver can't build or load multi-platform images), it will emulate builds.

```sh
docker buildx create --use --name wtmg-multiarch  # once; docker-container driver
docker buildx build . \
--platform linux/amd64,linux/arm64 \
-f ci/Dockerfile.ci \
-t ghcr.io/welcometomygarden/wtmg-e2e-ci:24-trixie \
--push
```
