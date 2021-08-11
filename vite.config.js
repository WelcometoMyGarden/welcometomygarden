import { resolve } from 'path';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import svgLoader from './src/util/svg-loader';

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
        svelte: resolve(__dirname, 'node_modules/svelte'),
        '@': resolve(__dirname, './src')
      }
    },
    plugins: [
      svgLoader({ removeSVGTagAttrs: false }),
      svelte({
        hot: !isProduction,
        emitCss: true,
        extensions: ['.svelte']
      })
    ]
  };
});
