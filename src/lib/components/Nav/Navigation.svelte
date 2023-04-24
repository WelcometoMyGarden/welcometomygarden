<script>
  import TopNav from './Top/TopNav.svelte';
  import MobileNav from './Mobile/MobileNav.svelte';
  import { isFullscreen } from '$lib/stores/fullscreen';
</script>

<!-- Prevents leak of icons that are still drawn on Safari, despite the height variables being set to 0 -->
{#if !$isFullscreen}
  <TopNav />
  <MobileNav />
{/if}
