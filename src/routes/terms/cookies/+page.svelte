<script lang="ts">
  import { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';
  import { onMount, SvelteComponent } from 'svelte';
  import { locale, _ } from 'svelte-i18n';

  let pageComponent: SvelteComponent | undefined;
  onMount(() =>
    locale.subscribe(
      async (loc) =>
        (pageComponent = (await import(`./cookie-pages/${coerceToSupportedLanguage(loc)}.svelte`))
          .default)
    )
  );
</script>

<svelte:head>
  <!-- TODO: return cookies.title -->
  <title>{$_('cookies.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

{#if pageComponent}
  <svelte:component this={pageComponent} />
{/if}
