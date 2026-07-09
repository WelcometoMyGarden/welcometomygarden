<script lang="ts">
  import Footer from '$lib/components/Footer.svelte';
  import MinimalFooter from '$lib/components/MinimalFooter.svelte';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import routes, { currentRoute } from '$lib/routes';
  import { appHasLoaded } from '$lib/stores/app';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

{#if $appHasLoaded}
  <Navigation />
  <main>{@render children?.()}</main>
  {#if $currentRoute === routes.MAP || $currentRoute === routes.EVERY_15KM}
    <MinimalFooter />
  {:else}
    <Footer />
  {/if}
{/if}
