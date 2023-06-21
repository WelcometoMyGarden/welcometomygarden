<script lang="ts">
  import trackEvent from '$lib/util/track-event';
  import { createEventDispatcher } from 'svelte';

  export let href: string;
  /**
   * Whether this should prevent the default href nav
   */
  export let preventing = false;
  export let newtab: boolean | undefined = undefined;
  export let track: Parameters<typeof trackEvent> | undefined = undefined;

  const dispatch = createEventDispatcher<{ click: MouseEvent }>();

  const handleClick = (e: MouseEvent) => {
    if (preventing) {
      e.preventDefault();
    }
    if (track) {
      trackEvent(...track);
    }
    dispatch('click', e);
  };
</script>

<!-- @component
Simple anchor link component, mostly to avoid repeated styling -->
<a {href} on:click={handleClick} target={newtab ? '_blank' : undefined} rel="noopener"><slot /></a>

<style>
  a,
  a:link,
  a:visited,
  a:active {
    cursor: pointer;
    color: var(--color-orange);
    text-decoration: underline;
  }

  a:hover {
    text-decoration: none;
  }
</style>
