<script>
  import { Router } from '@sveltech/routify';
  import { routes } from '@sveltech/routify/tmp/routes';
  import { locale, init } from 'svelte-i18n';
  import { setCookie, getCookie } from '@/util';
  import registerLocales from '@/locales/register';

  let lang = getCookie('locale'); //en or nl or ...
  if (!lang && window.navigator.language)
    lang = window.navigator.language.split('-')[0].toLowerCase();
  if (!lang) lang = 'en';

  registerLocales();

  init({ fallbackLocale: 'en', initialLocale: lang });

  locale.subscribe((value) => {
    if (value == null) return;

    // if running in the client, save the language preference in a cookie
    if (typeof window !== 'undefined') setCookie('locale', value, { path: '/' });
  });
</script>

<Router {routes} />
