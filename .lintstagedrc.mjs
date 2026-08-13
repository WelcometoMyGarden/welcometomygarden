// lint-staged: runs on staged files pre-commit (husky). Only changed files.
//
// Two separate ESLint configs — the root `eslint.config.js` ignores `api/`,
// and `api/` has its own — but one shared Prettier config. `eslint --fix` and
// `prettier --write` are kept in the same array so they run sequentially on a
// file rather than racing across concurrent glob groups.
//
// Note: lint-staged appends the specific files to be linted to the commands specified below
// as arguments
export default {
  // Frontend code → frontend ESLint + Prettier.
  '{src,tests}/**/*.{js,ts,svelte}': ['eslint --fix --no-warn-ignored', 'prettier --write'],

  // Root config files (svelte/vite/eslint/playwright/capacitor.config.*).
  '*.config.{js,ts,cjs,mjs}': ['eslint --fix --no-warn-ignored', 'prettier --write'],

  // api/ code → api ESLint config + Prettier (includes scripts/*.mjs).
  'api/**/*.{js,cjs,mjs}': [
    'eslint --config api/eslint.config.js --no-config-lookup --fix --no-warn-ignored',
    'prettier --write'
  ],

  // api/ TypeScript (.ts/.d.ts) → Prettier only: the api ESLint config is
  // CommonJS/JS and can't parse TS (mirrors `cd api && yarn lint`).
  'api/**/*.ts': 'prettier --write',

  // Everything else formattable, repo-wide (api + frontend + root docs/config).
  // Prettier silently skips `.prettierignore`d paths, e.g. api/test/input.
  '**/*.{json,jsonc,md,mdx,css,scss,html,yml,yaml}': 'prettier --write'
};
