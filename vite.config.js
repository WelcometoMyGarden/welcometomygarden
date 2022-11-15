import { resolve } from 'path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { customSvgLoader } from './plugins/rollup/svg-loader.js';
import { createAvailableLocales } from './plugins/rollup/available-locales.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

/* eslint-env node */
export default defineConfig(() => {
  const isProduction = process.env.MODE === 'production' || process.env.MODE === 'staging';
  return {
    build: {
      polyfillDynamicImport: false,
      cssCodeSplit: false,
      minify: isProduction
    },
    optimizeDeps: { exclude: ['@roxi/routify'] },
    resolve: {
      dedupe: ['@roxi/routify'],
      alias: {
        svelte: resolve(dirName, 'node_modules/svelte'),
        '@': resolve(dirName, './src')
      }
    },
    plugins: [
      createAvailableLocales(),
      customSvgLoader({ removeSVGTagAttrs: false }),
      svelte({
        hot: !isProduction,
        emitCss: true,
        extensions: ['.svelte']
      })
    ]
  };
});
