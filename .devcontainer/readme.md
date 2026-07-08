# WTMG Dev Container

A full-stack, isolated development environment that reuses the CI/E2E base image
([`ci/Dockerfile.ci`](../ci/Dockerfile.ci) → `ghcr.io/welcometomygarden/wtmg-e2e-ci:24`)
and extends it with interactive tooling: **git, lazygit, zellij, zsh (default
shell), nvm, Claude Code**. Useful for unsupervised agentic coding sessions/tasks.

The container runs as **root**, matching the CI e2e image
(`.github/workflows/test-e2e-emulators.yml` uses `--user root`): Playwright and
the Firebase emulators in this base are set up for root, and uid 1000 breaks
e2e. Since the source and Claude config live in named volumes (no host bind
mounts), root doesn't pollute host file ownership.

Unlike [`ci/Dockerfile.local-test`](../ci/Dockerfile.local-test), the source is
not copied from the host. Instead the container **clones the repo into a
named volume** (`wtmg-src`) on first create, and runs the demo dev servers in a
persistent [zellij](https://zellij.dev) session.

## Setup

Requirement: the devcontainers CLI: https://github.com/devcontainers/cli (or VS Code, with the caveats below). Then run these from the repo root:

1. Copy the env template and fill in the secrets (same 5 as `ci/.env.local`):

   ```sh
   cp .devcontainer/.env.local.example .devcontainer/.env.local
   ```

   All values are optional — the public repo clones fine and the app boots
   without secrets (some features, e.g. map tiles, need them).

2. Run:

   ```sh
   # Build the base image locally
   ./ci/local-build.sh

   # Build and start the dev container
   BASE_IMAGE=wtmg-e2e-ci:24 devcontainer up --workspace-folder .
   ```

3. Attach

   ```sh
   devcontainer exec --workspace-folder . zellij a
   ```

   Optionally, use VS Code → **Reopen in Container**, but know that VSCode Dev Container is [leaking access to the host quite a bit](https://www.danieldemmel.me/blog/coding-agents-in-secured-vscode-dev-containers).

To rebuild:

```sh
BASE_IMAGE=wtmg-e2e-ci:24 devcontainer build  --workspace-folder .
BASE_IMAGE=wtmg-e2e-ci:24 devcontainer up --workspace-folder . --remove-existing-container
```

## What happens

- **postCreateCommand** → [`bootstrap-repo.sh`](bootstrap-repo.sh) — clones
  `REPO_URL` (default: the public WTMG repo; `GITHUB_PAT` injected if set) into
  the `wtmg-src` volume, downloads the public static assets from
  `gs://wtmg-static/assets` (gitignored, required by the source; mirrors the CI
  workflow), and installs dependencies. **Idempotent**: re-running it after a
  rebuild never re-clones or overwrites an existing working copy.
- **postStartCommand** → [`start-dev.sh`](start-dev.sh) — runs `ci/fill-envs.sh`,
  then launches a headless zellij session **`dev`** with two side-by-side panes
  ([`dev-layout.kdl`](dev-layout.kdl)):
  - **frontend** → `yarn dev` (Vite, http://localhost:5173)
  - **api** → `yarn firebase:demo-seed` (Firebase demo emulators + seed data)
