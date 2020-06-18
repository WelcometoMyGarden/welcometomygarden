<script>
  import { Router, basepath } from '@sveltech/routify';
  import { routes } from '@sveltech/routify/tmp/routes';

  const lang = navigator.language ? navigator.language.toLowerCase() : 'en';

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

  const locale = Object.keys(langs).find(code => langs[code].includes(lang)) || 'en';

  console.log(locale);
</script>

<Router {routes} />
