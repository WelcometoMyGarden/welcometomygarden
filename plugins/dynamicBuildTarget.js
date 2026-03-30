/**
 *
 * Override transpilation config for browser builds to support the JS language syntax available in older browsers (roughly targeting ES2021)
 *
 * Based on: https://github.com/sveltejs/kit/issues/9544#issuecomment-1906634069
 *
 * Note that we can *not* specify this config in the top-level vite build.target config here,
 * because SvelteKit's server (also used for adapter-static) uses top-level await (an ES2022 feature)
 * and its transpilaton target is pinned to node18.13 at the moment of writing, which definitely supports ES2022
 * https://github.com/sveltejs/kit/blob/f433958aa5921a9915861e569daf517b54681314/packages/kit/src/exports/vite/index.js#L939
 *
 * Setting build.target seems to overwrite this to ES2021 for all environments => the server build complains that the transpilation target
 * does not support top-level await, which is required (see https://esbuild.github.io/content-types/#javascript)
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
       * ES2021 support exists from Chrome 85/Firefox 79/iOS 14.5 or 15, which are our support targets.
       * see summary at the bottom in: https://caniuse.com/?feats=mdn-javascript_builtins_string_replaceall%2Cmdn-javascript_builtins_promise_any%2Cmdn-javascript_builtins_weakref%2Cmdn-javascript_operators_logical_or_assignment%2Cmdn-javascript_operators_logical_and_assignment%2Cmdn-javascript_operators_nullish_coalescing_assignment%2Cmdn-javascript_grammar_numeric_separators%2Cmdn-javascript_builtins_finalizationregistry
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
      return { build: { target: ['es2021', 'edge85', 'firefox79', 'chrome85', 'safari15'] } };
    }
  }
};
