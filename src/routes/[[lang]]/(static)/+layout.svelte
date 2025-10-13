<script lang="ts">
  import { staticAppHasLoaded } from '$lib/stores/app';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

{#if $staticAppHasLoaded}
  <Navigation />
  <main>
    <slot />
  </main>
  <Footer />
{/if}
