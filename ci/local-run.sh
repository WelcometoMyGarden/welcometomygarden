#!/bin/bash
# Convenience script to run the local e2e testing image
# Requires .env.runner to be present
cd $(dirname $0)/..
# Expose files needed to run the front-end & backend,
# given that the deps are already installed
#
# Bind-mount the Playwright HTML report out of the container, so it survives
# `--rm` and can be inspected on the host afterwards with:
#
#   npx playwright show-report
#
# (Opening playwright-report/index.html over file:// cannot load the traces
# it embeds — it has to be served.)
#
# Serving the report from *inside* the container instead is not an option:
# ci/env-templates/test.env sets CI=true, and Playwright's html reporter skips
# its auto-open/serve step entirely when CI is set, whatever `open` is set to.
mkdir -p playwright-report
docker run --rm -it  \
--env-file ci/.env.local \
-v $(readlink -f $(dirname $0)/../playwright-report):/app/playwright-report \
-t wtmg-e2e-local:latest "$@"
cd -

