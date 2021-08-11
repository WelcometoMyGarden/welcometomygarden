<script>
  import { Router } from '@roxi/routify';
  import { routes } from '@roxi/routify/tmp/routes';
  import { register, locale, init } from 'svelte-i18n';
  import { setCookie, getCookie } from '@/util';

  let lang = getCookie('locale');
  if (!lang && navigator.language) lang = navigator.language.toLowerCase();
  if (!lang) lang = 'en';

  const langs = {
    en: [
      'en',
      'en-au',
      'en-bz',
      'en-ca',
      'en-ie',
      'en-jm',
      'en-nz',
      'en-ph',
      'en-za',
      'en-tt',
      'en-gb',
      'en-us',
      'en-zw'
    ],
    nl: ['nl', 'nl-be'],
    fr: ['fr', 'fr-be', 'fr-ca', 'fr-fr', 'fr-lu', 'fr-mc', 'fr-ch']
  };

  const languageCode = Object.keys(langs).find((code) => langs[code].includes(lang)) || 'en';

  register('en', () => import('@/locales/en.json'));
  register('fr', () => import('@/locales/fr.json'));
  register('nl', () => import('@/locales/nl.json'));

  init({ fallbackLocale: 'en', initialLocale: languageCode });

  locale.subscribe((value) => {
    if (value == null) return;

    // if running in the client, save the language preference in a cookie
    if (typeof window !== 'undefined') setCookie('locale', value, { path: '/' });
  });
</script>

<Router {routes} />
