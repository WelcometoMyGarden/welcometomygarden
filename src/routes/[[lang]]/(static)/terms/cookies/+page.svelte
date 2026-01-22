<script lang="ts">
  import { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';
  import { type Component } from 'svelte';
  import { locale, _ } from 'svelte-i18n';

  // TODO: once svelte-stripe supports async svelte, we can load the child component on
  // component init here
  // see https://github.com/joshnuss/svelte-stripe/pull/131#issuecomment-3777313193
  // const PageComponent: Component | undefined = $derived(
  //   await import(`./cookie-pages/${coerceToSupportedLanguage($locale)}.svelte`).then(
  //     (r) => r.default
  //   )

  let PageComponentPromise: Promise<Component> = $derived(
    import(`./cookie-pages/${coerceToSupportedLanguage($locale)}.svelte`).then((r) => r.default)
  );
</script>

<svelte:head>
  <!-- TODO: return cookies.title -->
  <title>{$_('cookies.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

{#await PageComponentPromise then PageComponent}
  <PageComponent></PageComponent>
{/await}
