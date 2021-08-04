<script>
  import { Router } from '@sveltech/routify';
  import { routes } from '@sveltech/routify/tmp/routes';
  import { register, locale, init } from 'svelte-i18n';
  import { setCookie, getCookie } from '@/util';
  import locales from 'app-locales';

  let lang = getCookie('locale'); //en or nl or ...
  if (!lang && window.navigator.language)
    lang = window.navigator.language.split('-')[0].toLowerCase();
  if (!lang) lang = 'en';

  for (const [language, importFn] of Object.entries(locales)) {
    register(language, importFn);
  }

  init({ fallbackLocale: 'en', initialLocale: lang });

  locale.subscribe((value) => {
    if (value == null) return;

    // if running in the client, save the language preference in a cookie
    if (typeof window !== 'undefined') setCookie('locale', value, { path: '/' });
  });
</script>

<Router {routes} />
