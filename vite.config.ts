/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import mkcert from 'vite-plugin-mkcert';
import envIsTrue from './src/lib/util/env-is-true';
import { sentrySvelteKit } from '@sentry/sveltekit';
import dynamicBuildTarget from './plugins/dynamicBuildTarget';
import stripCSSWhereSelectors from './plugins/stripCSSWhereSelectors';
import { readFileSync } from 'node:fs';
import { execSync, spawnSync } from 'node:child_process';
import os from 'os';

/* eslint-env node */
export default defineConfig(({ command, mode }): UserConfig => {
  // Careful: this will not include the "always available" env vars (https://vitejs.dev/guide/env-and-mode.html#env-variables)
  // like MODE and DEV; those are available from the UserConfig somehow.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const isProductionBuild = command === 'build' && (mode === 'production' || mode === 'staging');
  const useHTTPS = envIsTrue(process.env.VITE_USE_DEV_HTTPS) ?? false;

  const sentryUrl =
    typeof process.env.PUBLIC_SENTRY_DSN === 'string' && process.env.PUBLIC_SENTRY_DSN.length > 0
      ? new URL(process.env.PUBLIC_SENTRY_DSN)
      : null;

  // Finds whether there are untracked files, or uncommited files in the index
  const isDirty = spawnSync('git diff-index --quiet --cached HEAD --').status !== 0;
  const commitHash = `${execSync('git rev-parse --short HEAD').toString().trim()}${isDirty ? '-dirty' : ''}`;
  // Note: ISO 8601 is also possible https://git-scm.com/docs/pretty-formats#Documentation/pretty-formats.txt-cI
  const commitDate = execSync('git log -1 --format=%cd').toString();

  return {
    build: {
      minify: isProductionBuild ? 'esbuild' : false
    },
    define: {
      __COMMIT_HASH__: JSON.stringify(commitHash),
      __COMMIT_DATE__: JSON.stringify(commitDate),
      __BUILD_DATE__: JSON.stringify(new Date().toString().replace(/\s+\([^\)]+\)/, ''))
    },
    plugins: [
      ...(sentryUrl && process.env.SENTRY_AUTH_TOKEN
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
              hosts: ['localhost', '127.0.0.1', 'wtmg.dev', 'wtmg.staging']
            })
          ]
        : [])
    ],
    server: {
      // Includes localhost by default, check is skipped when HTTPS is used (see mkcert() and below)
      allowedHosts: [os.hostname().toLocaleLowerCase()],
      ...(useHTTPS && process.env.VITE_HTTPS_CERT_PATH
        ? {
            https: {
              cert: readFileSync(process.env.VITE_HTTPS_CERT_PATH),
              key: readFileSync(process.env.VITE_HTTPS_KEY_PATH)
            }
          }
        : {})
    },
    ssr: {
      // https://vitejs.dev/guide/ssr.html#ssr-externals
      // https://github.com/sveltekit-i18n/lib/issues/82
      noExternal: ['@sveltekit-i18n/*', 'intl-messageformat', '@formatjs/*']
    },
    resolve: {
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
