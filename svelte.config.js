// https://kit.svelte.dev/docs/adapter-static
import adapter from '@sveltejs/adapter-static';

import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: preprocess(),
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
