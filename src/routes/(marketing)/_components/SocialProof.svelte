<script>
  import SuperfanCounter from './SuperfanCounter.svelte';
  import { _ } from 'svelte-i18n';
  /** Centers the social proof text relative to it's container, expanding a little beyond its boundaries */
  export let centerRelative = false;
</script>

<p class:centerRelative>
  <SuperfanCounter />{' '}{$_('about-superfan.video-section.superfan-count')}
</p>

<style>
  p {
    text-align: center;
    margin-top: 0.75rem;
  }

  p.centerRelative {
    /* Make the text container bigger, centered relative to the button */
    position: relative;
    left: -3rem;
    width: calc(100% + 6rem);
  }
</style>
