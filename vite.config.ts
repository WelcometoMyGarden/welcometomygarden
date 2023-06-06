/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import type { UserConfig } from 'vite';
import { imagetools } from '@zerodevx/svelte-img/vite';

import { defineConfig } from 'vite';
import { createAvailableLocales } from './plugins/available-locales';
import { customSvgLoader } from './plugins/svg-loader';

/* eslint-env node */
export default defineConfig((): UserConfig => {
  const isProduction = process.env.MODE === 'production' || process.env.MODE === 'staging';
  return {
    build: {
      minify: isProduction
    },
    plugins: [
      createAvailableLocales(),
      customSvgLoader({ removeSVGTagAttrs: false }),
      sveltekit(),
      imagetools()
    ],
    test: {
      // Modified from
      // https://vitest.dev/config/#include
      include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
    }
  };
});
