// hooks.server.ts
import { DEFAULT_LANGUAGE } from '$lib/types/general';
import type { Handle } from '@sveltejs/kit';
import { locale } from 'svelte-i18n';

export const handle: Handle = async ({ event, resolve }) => {
  // SSR locale init based on Accept-Language
  const lang = event.request.headers.get('accept-language')?.split(',')[0];
  if (lang) {
    locale.set(lang);
  }
  return resolve(event, {
    // Set the right <html lang=""> attribute.
    // If per-page overrides are ever needed, we could transition to this approach:
    // https://github.com/sveltejs/kit/discussions/12376#discussioncomment-9876501
    transformPageChunk: ({ html }) => html.replace('%lang%', event.params.lang ?? DEFAULT_LANGUAGE)
  });
};
