/**
 *
 * Override config for production builds for the browser to support slightly older browsers, language-wise.
 *
 * Based on: https://web-platform-dx.github.io/web-features/supported-browsers/?targetYear=2020
 * Config from: https://github.com/sveltejs/kit/issues/9544#issuecomment-1906634069
 *
 * Note that we can *not* specify this in the top-level vite build.target config here,
 * because SvelteKit's server (also used for adapter-static) uses top-level await
 * and it is pinned to node18.13 at the moment of writing https://github.com/sveltejs/kit/blob/f433958aa5921a9915861e569daf517b54681314/packages/kit/src/exports/vite/index.js#L939
 *
 * Setting build.target seems to overwrite this for all environments => top-level await not available on server
 *
 *
 * @type {import('vite').Plugin}
 */
export default {
  name: 'dynamic-build-target',
  config(config, { command }) {
    if (command === 'build' && !config.build?.ssr) {
      /*
       * For ES2022+ features which will be transpiled, see https://esbuild.github.io/content-types/#javascript
       *
       * ES2021 support exists from Chrome 85 and iOS 15, which are our support targets.
       *
       * We chose these values with the goal of making WTMG compatible with iOS 15 (iPhone 6s and onwards)
       * and devices of a similar age (https://iosref.com/ios) (~2015/16 ~= 10 years old).
       *
       * By default, Svelte 5 is limited to Chrome 88 (iOS 14), but the other transform workaround (stripCSSWhereSelectors)
       * reduces its restrictions to Chrome >=64/Safari 13.4 (ResizeObserver), so we maintain our Chrome 85/iOS 15 target.
       *
       * Compatibility could reasonably be increased to iOS 13, given one polyfill (see https://github.com/sveltejs/svelte/issues/14420#issuecomment-2630571526)
       * and an ES2015 transpile target, but this would likely result in a trade-off with bundle size which we didn't analyze.
       */
      return { build: { target: ['es2021', 'edge87', 'firefox83', 'chrome87', 'safari14'] } };
    }
  }
};
