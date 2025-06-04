<script lang="ts">
  import { browser } from '$app/environment';
  import { Progress } from '$lib/components/UI';
  import { staticAppHasLoaded } from '$lib/stores/app';
  import Navigation from '$lib/components/Nav/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

{#if browser}
  <Progress active={!$staticAppHasLoaded} />
{/if}
{#if $staticAppHasLoaded}
  <Navigation />
  <main>
    <slot />
  </main>
  <Footer />
{/if}
