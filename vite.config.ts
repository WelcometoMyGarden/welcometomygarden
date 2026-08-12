/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { imagetools } from './plugins/svelteImgCached.js';
import mkcert from 'vite-plugin-mkcert';
import envIsTrue from './src/lib/util/env-is-true.js';
import { sentrySvelteKit } from '@sentry/sveltekit';
import dynamicBuildTarget from './plugins/dynamicBuildTarget.js';
import stripCSSWhereSelectors from './plugins/stripCSSWhereSelectors.js';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import os from 'os';

export default defineConfig(({ command, mode }): UserConfig => {
  // Careful: this will not include the "always available" env vars (https://vitejs.dev/guide/env-and-mode.html#env-variables)
  // like MODE and DEV; those are available from the UserConfig somehow.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const isProductionBuild = command === 'build' && (mode === 'production' || mode === 'staging');
  const useHTTPS = envIsTrue(process.env.VITE_USE_DEV_HTTPS) ?? false;

  // TODO: temporarily disabled — the Sentry/GlitchTip source-map upload integration is
  // currently broken and activates during builds. Re-enable (set to true) once our
  // self-hosted GlitchTip backend has been updated and the upload flow is debugged.
  const ENABLE_SENTRY_SOURCEMAPS = false;

  const sentryUrl =
    typeof process.env.PUBLIC_SENTRY_DSN === 'string' && process.env.PUBLIC_SENTRY_DSN.length > 0
      ? new URL(process.env.PUBLIC_SENTRY_DSN)
      : null;

  const extraLocalHosts = process.env.EXTRA_LOCAL_HOSTS
    ? process.env.EXTRA_LOCAL_HOSTS.split(',').map((s) => s.trim())
    : [];

  const dateFormat = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Brussels',
    timeZoneName: 'short'
  });

  // Git will complain about dubious ownership in the e2e test runner without this
  // NOTE: we might be able to remove this if we can manage to let the runner run without root
  const gitWithSafeDirOption = 'git -c safe.directory="$(pwd)"';

  const tryGit = (cmd: string): string => {
    try {
      return execSync(cmd).toString().trim();
    } catch {
      return '';
    }
  };

  const commitHash = tryGit(`${gitWithSafeDirOption} rev-parse --short HEAD`);
  // Note: ISO 8601 format from https://git-scm.com/docs/pretty-formats#Documentation/pretty-formats.txt-cI
  const commitDateRaw = tryGit(`${gitWithSafeDirOption} log -1 --format=%cI`);
  const commitDate = commitDateRaw ? dateFormat.format(new Date(commitDateRaw)) : '';
  const commitMessage = tryGit(`${gitWithSafeDirOption} log -1 --pretty=%B`).split('\n')[0];

  const httpsOptions =
    useHTTPS && process.env.VITE_HTTPS_CERT_PATH && process.env.VITE_HTTPS_KEY_PATH
      ? {
          https: {
            cert: readFileSync(process.env.VITE_HTTPS_CERT_PATH),
            key: readFileSync(process.env.VITE_HTTPS_KEY_PATH)
          }
        }
      : {};
  return {
    build: {
      // Vite 8 uses the Oxc minifier by default (esbuild was the Vite 7 default).
      minify: isProductionBuild ? 'oxc' : false,
      rolldownOptions: {
        // Drop DEV-labeled logger.debug calls from wtmg-production builds. In Vite 8
        // (Rolldown/Oxc) label-dropping is a bundler-level transform option, applied
        // across the whole module graph (incl. Svelte-compiled output) — unlike the
        // Vite 7 top-level `esbuild.dropLabels`, which no longer takes effect.
        // See https://github.com/evanw/esbuild/issues/3656#issuecomment-3996489063
        transform: {
          dropLabels: mode === 'production' ? ['DEV'] : []
        }
      }
    },
    define: {
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __COMMIT_DATE__: JSON.stringify(commitDate),
      __COMMIT_MESSAGE__: JSON.stringify(commitMessage),
      __BUILD_DATE__: JSON.stringify(dateFormat.format(new Date()))
    },
    plugins: [
      ...(ENABLE_SENTRY_SOURCEMAPS && sentryUrl && process.env.SENTRY_AUTH_TOKEN
        ? [
            sentrySvelteKit({
              sourceMapsUploadOptions: {
                org: 'Welcome To My Garden',
                project: 'WTMG Front-end',
                url: `${sentryUrl.protocol}//${sentryUrl.host}`,
                authToken: process.env.SENTRY_AUTH_TOKEN
              }
            })
          ]
        : []),
      sveltekit(),
      dynamicBuildTarget,
      stripCSSWhereSelectors,
      imagetools(),
      ...(useHTTPS && !process.env.VITE_HTTPS_CERT_PATH
        ? [
            mkcert({
              // Edit your hostfile to map wtmg.dev to 127.0.0.1
              // We are not using .local here, request that domain may attempt a multicast
              // https://en.wikipedia.org/wiki/.local and take long to resolve.
              hosts: ['localhost', '127.0.0.1', 'wtmg.dev', 'wtmg.staging', ...extraLocalHosts]
            })
          ]
        : [])
    ],
    server: {
      // Includes localhost by default, check is skipped when HTTPS is used (see mkcert() and below)
      allowedHosts: [os.hostname().toLocaleLowerCase(), ...extraLocalHosts],
      ...httpsOptions
    },
    preview: {
      ...httpsOptions
    },
    ssr: {
      // https://vitejs.dev/guide/ssr.html#ssr-externals
      // https://github.com/sveltekit-i18n/lib/issues/82
      noExternal: ['@sveltekit-i18n/*', 'intl-messageformat', '@formatjs/*']
    },
    resolve: {
      alias: [
        // Use mapbox-gl's ESM build (its `./esm` export) instead of the default UMD
        // bundle. The UMD build (the package `exports` "." entry) inlines its worker as a
        // stringified Blob run through a classic `new Worker()`. mapbox's own source has
        // no `import.meta`, but Vite wraps the UMD build's dynamic `import()`s with
        // `__vitePreload(..., import.meta.url)`, and that `import.meta.url` ends up inside
        // the stringified worker. Vite 8 dropped the import.meta.url polyfill for UMD/IIFE
        // output, so the built worker throws "Cannot use 'import.meta' outside a module"
        // and the map fails to load (dev is unaffected — modules are served natively).
        // The ESM build instead uses `new Worker(new URL('worker.js', import.meta.url),
        // { type: 'module' })`, which Vite bundles as its own (import.meta-free) worker.
        // Checked against mapbox-gl up to 3.28.1: the packaging/worker strategy is
        // unchanged, so bumping the dependency does not remove the need for this.
        // Exact-match regex so subpaths (e.g. 'mapbox-gl/dist/mapbox-gl.css') are untouched.
        //
        // This alias only affects bundling, not TypeScript: `import ... from 'mapbox-gl'`
        // still type-checks against the package's "." (UMD) type declarations, which can
        // diverge from what's actually bundled here. Since mapbox-gl 3.25.0 the ESM build
        // also dropped its default export (only named exports remain), and the "." and
        // "./esm" type declarations are independent files whose identically-named types
        // (e.g. `Map`, `Style`) are NOT interchangeable — mixing imports from both across
        // the app causes spurious "two different types with this name exist" errors. So
        // all app code importing mapbox-gl (value or type-only) uses `mapbox-gl/esm`
        // directly rather than relying on this alias.
        { find: /^mapbox-gl$/, replacement: 'mapbox-gl/esm' }
      ],
      // https://github.com/flekschas/svelte-simple-modal?tab=readme-ov-file#rollup-setup
      dedupe: ['svelte', 'svelte/transition', 'svelte/internal']
    },
    test: {
      // Modified from
      // https://vitest.dev/config/#include
      include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
    }
  };
});
