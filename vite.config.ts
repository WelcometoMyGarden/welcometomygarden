/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import { imagetools } from '@zerodevx/svelte-img/vite';
import { createAvailableLocales } from './plugins/available-locales';
import { customSvgLoader } from './plugins/svg-loader';
import mkcert from 'vite-plugin-mkcert';
import envIsTrue from './src/lib/util/env-is-true';

/* eslint-env node */
export default defineConfig(({ command, mode }): UserConfig => {
  // Careful: this will not include the "always available" env vars (https://vitejs.dev/guide/env-and-mode.html#env-variables)
  // like MODE and DEV; those are available from the UserConfig somehow.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  const isProductionBuild = command === 'build' && (mode === 'production' || mode === 'staging');
  const useHTTPS = envIsTrue(process.env.VITE_USE_DEV_HTTPS) ?? false;

  return {
    build: {
      minify: isProductionBuild ? 'esbuild' : false
    },
    plugins: [
      createAvailableLocales(),
      customSvgLoader({ removeSVGTagAttrs: false }),
      sveltekit(),
      imagetools(),
      ...(useHTTPS
        ? [
            mkcert({
              // Edit your hostfile to map wtmg.dev to 127.0.0.1
              // We are not using .local here, request that domain may attempt a multicast
              // https://en.wikipedia.org/wiki/.local and take long to resolve.
              hosts: ['localhost', '127.0.0.1', 'wtmg.dev']
            })
          ]
        : [])
    ],
    ssr: {
      // https://vitejs.dev/guide/ssr.html#ssr-externals
      // https://github.com/sveltekit-i18n/lib/issues/82
      noExternal: ['@sveltekit-i18n/*', 'intl-messageformat', '@formatjs/*']
    },
    test: {
      // Modified from
      // https://vitest.dev/config/#include
      include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
    }
  };
});
