<script lang="ts">
  import { staticAppHasLoaded } from '$lib/stores/app';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

{#if $staticAppHasLoaded}
  <Navigation />
  <main>
    {@render children?.()}
  </main>
  <Footer />
{/if}
