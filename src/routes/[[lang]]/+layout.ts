import type { LayoutLoad } from './$types';
import { browser } from '$app/environment';
import { isValidLocale } from '$lib/util/get-browser-lang';
import { error, redirect } from '@sveltejs/kit';

export const load: LayoutLoad = async ({ params: { lang: pathLang }, url, parent }) => {
  // TODO: maybe we want to init this with the browser lang like before?
  // To be able to use the right lang later if needed.
  console.debug('Inner layout load started');

  const { newPath } = await parent();

  if (browser) {
    // If an invalid language is given as a language path param, show an error.
    // Only do this client-side, since it doesn't make sense on SSR with SSG
    if (typeof pathLang === 'string' && pathLang.length > 0 && !isValidLocale(pathLang)) {
      console.warn(
        `${pathLang} is not a valid language path, and SvelteKit found no other matching routes.`
      );
      error(404);
    }
  }

  // We perform the redirect in this inner [[lang]]/layout.ts, because when doing it in
  // the root layout.ts, it leads to an infinite loop when rendering the error layout due
  // to a missing page under a valid lang param (like /fr/invalid-page)
  // In this case, SvelteKit will throw an internal 404 which doesn't touch [[lang]]/layout.ts at all,
  // but renders the root error layout straight away with 'Not Found'.
  // The error page will trigger a new root +layout.ts call, but somehow without the path lang parameter,
  // while still being on the same page (with an actual path lang). This makes the redirect logic
  // think it should prepend another 'fr/' -> same situation -> endless loop
  // By redirecting here based on the passed-down newPath, we work around this, because this
  // is only called if the full path is valid.
  if (newPath != null) {
    const newUrl = new URL(url);
    newUrl.pathname = newPath;
    console.log(`Redirecting ${url.pathname} to ${newPath}`);
    redirect(303, newUrl.toString());
  }
};
