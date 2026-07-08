# WTMG Dev Container image.
#
# Extends the CI/E2E base image (built from ci/Dockerfile.ci, published as
# ghcr.io/welcometomygarden/wtmg-e2e-ci:24) with interactive developer tooling:
# git, lazygit, zellij, zsh (default shell), nvm and Claude Code.
#
# Runs as root, matching the CI workflow (.github/workflows/test-e2e-emulators.yml
# uses `--user root`): Playwright/Chromium and the Firebase emulators in this base
# image are all set up for root, so a non-root user (uid 1000) breaks e2e. Because
# the source and Claude config live in named volumes (no host bind mounts, no
# Docker socket), running as root does not pollute host file ownership.
#
# Unlike ci/Dockerfile.local-test, this image does NOT copy the repo in. The
# source is cloned at container-create time into a named volume by
# bootstrap-repo.sh (postCreateCommand in devcontainer.json), so the working
# copy persists across rebuilds and stays isolated from the host checkout.
#
# Build context is the .devcontainer/ directory (see docker-compose.yml).

# Override with BASE_IMAGE=wtmg-e2e-ci:24 to use a locally-built base
# (see ci/local-build.sh) instead of pulling the published one.
ARG BASE_IMAGE=ghcr.io/welcometomygarden/wtmg-e2e-ci:24
FROM ${BASE_IMAGE}

# The base image already runs as root; everything below builds on that.
USER root

# git + zsh, plus utilities used to fetch the release binaries below.
RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      zsh \
      ca-certificates \
      curl \
    && rm -rf /var/lib/apt/lists/*

# Google Cloud SDK (gsutil) — used by bootstrap-repo.sh to fetch the public
# static assets from gs://wtmg-static, mirroring the CI e2e workflow (which
# installs it via google-github-actions/setup-gcloud). apt-transport-https + gpg
# come from the base image.
RUN curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
      | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
      > /etc/apt/sources.list.d/google-cloud-sdk.list \
    && apt-get update && apt-get install -y --no-install-recommends google-cloud-cli \
    && rm -rf /var/lib/apt/lists/*

# lazygit — static binary from GitHub releases (arch-aware).
RUN ARCH="$(uname -m)" \
    && case "$ARCH" in \
         x86_64)  LG_ARCH="x86_64" ;; \
         aarch64) LG_ARCH="arm64"  ;; \
         *) echo "Unsupported arch: $ARCH" && exit 1 ;; \
       esac \
    && LG_VERSION="$(curl -fsSL https://api.github.com/repos/jesseduffield/lazygit/releases/latest \
         | grep -oP '"tag_name":\s*"v\K[^"]+')" \
    && curl -fsSL "https://github.com/jesseduffield/lazygit/releases/download/v${LG_VERSION}/lazygit_${LG_VERSION}_Linux_${LG_ARCH}.tar.gz" \
         -o /tmp/lazygit.tar.gz \
    && tar -xzf /tmp/lazygit.tar.gz -C /usr/local/bin lazygit \
    && chmod +x /usr/local/bin/lazygit \
    && rm /tmp/lazygit.tar.gz

# zellij — static musl binary from GitHub releases (arch-aware).
RUN ARCH="$(uname -m)" \
    && case "$ARCH" in \
         x86_64)  ZJ_TARGET="x86_64-unknown-linux-musl"  ;; \
         aarch64) ZJ_TARGET="aarch64-unknown-linux-musl" ;; \
         *) echo "Unsupported arch: $ARCH" && exit 1 ;; \
       esac \
    && curl -fsSL "https://github.com/zellij-org/zellij/releases/latest/download/zellij-${ZJ_TARGET}.tar.gz" \
         -o /tmp/zellij.tar.gz \
    && tar -xzf /tmp/zellij.tar.gz -C /usr/local/bin zellij \
    && chmod +x /usr/local/bin/zellij \
    && rm /tmp/zellij.tar.gz

# Claude Code — installed globally (on PATH). The container runs a fully
# independent session; its config is persisted in the wtmg-claude volume
# (see CLAUDE_CONFIG_DIR below + docker-compose.yml).
RUN npm install -g @anthropic-ai/claude-code

# Make zsh root's default login shell (VS Code opens terminals with it).
RUN usermod -s "$(command -v zsh)" root
# `docker exec` / `devcontainer exec` don't go through login, so they don't read
# the shell from /etc/passwd and $SHELL ends up empty — which is why zellij spawns
# a fallback (sh) pane and `echo $SHELL` prints nothing. Set SHELL in the image so
# every process (incl. zellij's panes) sees zsh.
ENV SHELL=/usr/bin/zsh

# Clone target = mount point of the named source volume.
ENV WORKSPACE_DIR=/root/welcometomygarden
RUN mkdir -p "$WORKSPACE_DIR"

# Claude Code config/state directory. Consolidating everything (config, the
# former ~/.claude.json, projects, cache) under one dir lets a single named
# volume mounted here persist the whole independent session across rebuilds.
ENV CLAUDE_CONFIG_DIR=/root/.claude
RUN mkdir -p "$CLAUDE_CONFIG_DIR"

# Lifecycle scripts + zellij layout, baked into the image because they run
# (postCreate/postStart) before and independently of the cloned working copy.
COPY bootstrap-repo.sh start-dev.sh dev-layout.kdl /root/
RUN chmod +x /root/bootstrap-repo.sh /root/start-dev.sh

# ── nvm, wired into zsh ───────────────────────────────────────────────────────
ENV NVM_DIR=/root/.nvm
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash \
    && . "$NVM_DIR/nvm.sh" \
    && nvm install 24 \
    && nvm alias default 24
# Source nvm from both interactive (.zshrc) and login (.zprofile) zsh startup.
RUN printf '%s\n' \
      'export NVM_DIR="$HOME/.nvm"' \
      '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' \
      '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' \
      | tee -a /root/.zshrc /root/.zprofile > /dev/null

# Auto-run `nvm use` on cd into a directory with a .nvmrc (nvm README, zsh
# variant). Interactive-only (chpwd hook), so it goes in .zshrc AFTER nvm init.
RUN printf '%s\n' \
      '' \
      'autoload -U add-zsh-hook' \
      'load-nvmrc() {' \
      '  local nvmrc_path' \
      '  nvmrc_path="$(nvm_find_nvmrc)"' \
      '' \
      '  if [ -n "$nvmrc_path" ]; then' \
      '    local nvmrc_node_version' \
      '    nvmrc_node_version=$(nvm version "$(cat "${nvmrc_path}")")' \
      '' \
      '    if [ "$nvmrc_node_version" = "N/A" ]; then' \
      '      nvm install' \
      '    elif [ "$nvmrc_node_version" != "$(nvm version)" ]; then' \
      '      nvm use' \
      '    fi' \
      '  elif [ -n "$(PWD=$OLDPWD nvm_find_nvmrc)" ] && [ "$(nvm version)" != "$(nvm version default)" ]; then' \
      '    echo "Reverting to nvm default version"' \
      '    nvm use default' \
      '  fi' \
      '}' \
      '' \
      'add-zsh-hook chpwd load-nvmrc' \
      'load-nvmrc' \
      >> /root/.zshrc

WORKDIR /root/welcometomygarden
