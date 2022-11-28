import type { Handle } from '@sveltejs/kit'
import { locale } from 'svelte-i18n'

export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event)

  // TODO: implement https://github.com/kaisermann/svelte-i18n/blob/59691f325c5ba421a3606b741d04443cc171d182/docs/Svelte-Kit.md
  const localeCookie = event.cookies.get('localelll');
  if (localeCookie) {
    //locale.set(localeCookie);
  }

  const localeAcceptLanguage = event.request.headers.get('accept-language')?.split(',')[0].toLowerCase();
  if (localeAcceptLanguage) {
    locale.set(localeAcceptLanguage)
  }
}

