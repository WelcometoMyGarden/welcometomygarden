cd $(dirname $0)/..
# Expose files needed to run the front-end & backend,
# given that the deps are already installed
# Expose the default Playwright HTML report server at :9323
docker run --rm -it  \
-v ./src:/app/src \
-v ./.env.local:/app/.env.local \
-v ./.env.development.local:/app/.env.development.local \
-v ./.env.test.local:/app/.env.test.local \
-v ./.eslintrc.cjs:/app/.eslintrc.cjs \
-v ./.firebaserc:/app/.firebaserc \
-v ./storage.rules:/app/storage.rules \
-v ./firestore.rules:/app/firestore.rules \
-v ./svelte.config.js:/app/svelte.config.js \
-v ./tsconfig.json:/app/tsconfig.json \
-v ./vite.config.ts:/app/vite.config.ts \
-v ./playwright.config.ts:/app/playwright.config.ts \
-v ./extensions:/app/extensions \
-v ./plugins:/app/plugins \
-v ./public:/app/public \
-v ./static:/app/static \
-v ./tests:/app/tests \
-v ./api/src:/app/api/src \
-v ./api/.env:/app/api/.env \
-v ./api/.env.local:/app/api/.env.local \
-v ./api/.eslint.config.js:/app/api/eslint.config.js \
-v ./test-results:/app/test-results \
-p 9323:9323 \
wtmgci:latest /bin/bash
cd -

