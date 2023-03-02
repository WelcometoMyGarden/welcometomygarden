<script lang="ts">
  import { locale, _ } from 'svelte-i18n';
  import En from './cookie-pages/en.svelte';
  import Nl from './cookie-pages/nl.svelte';
  import Fr from './cookie-pages/fr.svelte';

  const localeToCookiePageHTML = (loc?: string | null) => {
    switch (loc) {
      case 'fr':
        return Fr;
      case 'nl':
        return Nl;
      default:
        return En;
    }
  };

  $: pageComponent = localeToCookiePageHTML($locale);
</script>

<svelte:head>
  <!-- TODO: return cookies.title -->
  <title>{$_('cookies.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<svelte:component this={pageComponent} />
