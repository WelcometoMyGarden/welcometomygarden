<script lang="ts">
  import SuperfanCounter from './SuperfanCounter.svelte';
  import { _ } from 'svelte-i18n';

  interface Props {
    /** Centers the social proof text relative to it's container, expanding a little beyond its boundaries */
    centerRelative?: boolean;
  }

  let { centerRelative = false }: Props = $props();
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
