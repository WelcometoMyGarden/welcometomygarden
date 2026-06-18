<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { page } from '$app/state';
  import { localeIsLoaded } from '$lib/stores/app';
  import ErrorTemplate from '$lib/components/ErrorTemplate.svelte';

  const isNotFound = $derived(
    page.error?.message === 'Not Found' || page.error?.message === 'Error: 404'
  );

  let title = $derived(
    isNotFound && $localeIsLoaded
      ? { key: $_('fallback.404') }
      : (page.error?.message ?? 'Something went wrong')
  );
</script>

<svelte:head>
  {#if $localeIsLoaded}
    {#if page.error?.message === 'Not Found'}
      <title>{$_('fallback.404')} | {$_('generics.wtmg.explicit')}</title>
    {:else}
      <title>Error | {$_('generics.wtmg.explicit')}</title>
    {/if}
  {:else}
    <title>Error | Welcome To My Garden</title>
  {/if}
</svelte:head>

<ErrorTemplate {title} />
