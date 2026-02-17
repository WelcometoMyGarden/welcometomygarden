// https://kit.svelte.dev/docs/adapter-static
import adapter from '@sveltejs/adapter-static';
import { sveltePreprocess } from 'svelte-preprocess';
// Refactored the following to pure JS because TS support is not stable in Node.js yet
// https://github.com/sveltejs/kit/pull/13935
import { SUPPORTED_LANGUAGES } from './src/lib/types/general.js';
import { urlPathPrefix } from './src/lib/util/translation-shared.js';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: sveltePreprocess(),
  kit: {
    // https://stackoverflow.com/a/74222951/4973029
    alias: {
      $routes: './src/routes',
      $locales: './src/locales'
    },
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      precompress: false,
      fallback: '200.html'
    }),
    prerender: {
      crawl: true,
      // Prevents: "The following routes were marked as prerenderable, but were not prerendered because they were not found while crawling your app:"
      entries: [
        '*',
        // Include the index page for every supported language.
        // This explicit list is an alternative to using <a href>s
        // in the language selector component, which could be detected by the Svelte crawler.
        ...SUPPORTED_LANGUAGES.map((l) => urlPathPrefix(l)).filter((s) => s !== ''),
        '/chat/[name]/[chatId]',
        '/explore/garden/[gardenId]',
        '/explore/meetup/[meetupId]',
        '/become-superfan/[payment]',
        '/become-superfan/[payment]/[id]',
        '/become-member/payment/[id]'
      ]
    }
  },
  onwarn: (warning) => {
    // https://github.com/sveltejs/vite-plugin-svelte/blob/main/docs/config.md#config-file-resolving
    if (warning.code === 'security-anchor-rel-noreferrer') return;
  }
};

export default config;
