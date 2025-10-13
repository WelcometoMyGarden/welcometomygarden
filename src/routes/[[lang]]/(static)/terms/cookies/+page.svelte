<script lang="ts">
  import { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';
  import { onMount, SvelteComponent } from 'svelte';
  import { locale, _ } from 'svelte-i18n';

  let pageComponent: SvelteComponent | undefined;

  onMount(() =>
    locale.subscribe(async (loc) => {
      // TODO: replace this with the more idiomatic expression that came before
      // This is workaround for a Vite bug: https://github.com/vitejs/vite/issues/11824#issuecomment-1407392982
      // The bug was fixed and merged, but is tagged 7.0 beta (currently we're on v5): https://github.com/vitejs/vite/commit/2a391a7df6e5b4a8d9e8313fba7ddf003df41e12
      const modules = import.meta.glob('./cookie-pages/*.svelte');
      const module = await modules[`./cookie-pages/${coerceToSupportedLanguage(loc)}.svelte`]();
      // @ts-ignore
      pageComponent = module.default;
    })
  );
</script>

<svelte:head>
  <!-- TODO: return cookies.title -->
  <title>{$_('cookies.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

{#if pageComponent}
  <svelte:component this={pageComponent} />
{/if}
