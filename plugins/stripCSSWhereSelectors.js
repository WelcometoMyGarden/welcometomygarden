/**
 * Don't use the :where() used by default by Svelte 5
 * See https://github.com/sveltejs/svelte/pull/10443
 *
 * This has two effects:
 * - supporting Chrome 85-87, which have our target ES2021 support, but don't have :where() support
 * - More important: graceful degradation on Chrome <85.
 *   For some reason, the :where() selector breaks all styles and renders static HTML invisible
 *   on some browsers where the CSS partially loads (Chrome 84)
 *
 * From: https://github.com/sveltejs/svelte/issues/14420#issuecomment-2630571526
 *
 * @type {import('vite').Plugin}
 */
export default {
  name: 'strip-css-where-selectors',
  enforce: 'post',
  transform(code, id) {
    if (id.endsWith('.css')) {
      return code.replace(/:where\((.+?)\)/g, '$1');
    }
    return code;
  },
  async generateBundle(_, bundle) {
    for (const [key, asset] of Object.entries(bundle)) {
      if (asset.type === 'asset' && key.endsWith('.css')) {
        asset.source = asset.source.toString().replace(/:where\((.+?)\)/g, '$1');
      }
    }
  }
};
