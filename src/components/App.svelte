<script>
  import { Router } from '@sveltech/routify';
  import { routes } from '@sveltech/routify/tmp/routes';
  import { register, locale, waitLocale, init } from 'svelte-i18n';
  import { setCookie, getCookie } from '@/util';
  import allLocales from '@/locales';

  let lang = getCookie('locale'); //en or nl or ...
  if (!lang && window.navigator.language)
    lang = window.navigator.language.split('-')[0].toLowerCase();
  if (!lang) lang = 'en';

  const languageCode = allLocales.includes(lang) ? lang : 'en';

//todo find fix for dynamic imports
/*   allLocales.map((availableLocale) => {
    register(l, () => import(`@/locales/${availableLocale}.json`));
  });
 */
  register('en', () => import('@/locales/en.json'));
  register('fr', () => import('@/locales/fr.json'));
  register('nl', () => import('@/locales/nl.json'));
  register('de', () => import('@/locales/de.json'));
  register('es', () => import('@/locales/es.json'));

  init({ fallbackLocale: 'en', initialLocale: languageCode });

  export async function preload() {
    return waitLocale();
  }

  locale.subscribe((value) => {
    if (value == null) return;

    // if running in the client, save the language preference in a cookie
    if (typeof window !== 'undefined') setCookie('locale', value, { path: '/' });
  });
</script>

<Router {routes} />
