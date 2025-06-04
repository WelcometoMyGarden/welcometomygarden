<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import Footer from '$lib/components/Footer.svelte';
  import MinimalFooter from '$lib/components/MinimalFooter.svelte';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import { Progress } from '$lib/components/UI';
  import routes from '$lib/routes';
  import { appHasLoaded } from '$lib/stores/app';
  import { isActiveContains } from '$lib/util/isActive';
</script>

{#if browser}
  <Progress active={!$appHasLoaded} />
{/if}
{#if $appHasLoaded}
  <Navigation />
  <main><slot /></main>
  {#if isActiveContains($page, routes.MAP)}
    <MinimalFooter />
  {:else}
    <Footer />
  {/if}
{/if}
