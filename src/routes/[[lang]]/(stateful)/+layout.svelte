<script lang="ts">
  import { page } from '$app/stores';
  import Footer from '$lib/components/Footer.svelte';
  import MinimalFooter from '$lib/components/MinimalFooter.svelte';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import routes from '$lib/routes';
  import { appHasLoaded } from '$lib/stores/app';
  import { isActiveContains } from '$lib/util/isActive';
</script>

{#if $appHasLoaded}
  <Navigation />
  <main><slot /></main>
  {#if isActiveContains($page, routes.MAP)}
    <MinimalFooter />
  {:else}
    <Footer />
  {/if}
{/if}
