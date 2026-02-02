#!/bin/bash
# Convenience script to run the local e2e testing image
# Requires .env.runner to be present
cd $(dirname $0)/..
# Expose files needed to run the front-end & backend,
# given that the deps are already installed
# Expose the default Playwright HTML report server at :9323
docker run --rm -it  \
-p 9323:9323 \
--env-file ci/.env.local \
-v $(readlink -f $(dirname $0)/../test-results):/app/test-results \
-t wtmg-e2e-local:latest "$@"
cd -

