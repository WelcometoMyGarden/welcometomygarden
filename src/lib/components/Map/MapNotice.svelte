<script lang="ts">
  import { fade } from 'svelte/transition';
  interface Props {
    show?: boolean;
    children?: import('svelte').Snippet;
  }

  let { show = $bindable(false), children }: Props = $props();
</script>

{#if show}
  <div transition:fade>
    <p>
      {@render children?.()}
    </p>
  </div>
{/if}

<style>
  div {
    z-index: 1;
    padding: 4px 8px;
    border-radius: 10px;
    /* Same as the layers & tools background */
    background-color: rgba(255, 255, 255, 0.9);
    position: absolute;
    /* Same as the filter box */
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    /* Make it possible to drag the map below the notice.
       Should be complemented with an exception for the link inside (see below) */
    pointer-events: none;
  }

  /* Make the link clickable */
  div :global(a) {
    pointer-events: auto;
  }

  /* TODO: the absolute positioning here is dependent on the sizing of other components overlaying the map.
   * Some of those components are not <Map> children, but this component needs to be a child of Map's context to listen to map zoom events.
   * This hacky approach of absolute positioning from different component parents is now deemed preferrable over refactoring the component structures
   * so that they are positioned relative to eachother with e.g. flexbox or such.
   */

  /* Mobile */
  @media screen and (max-width: 700px) {
    div {
      left: 48px;
      top: calc(env(safe-area-inset-top, 0px) + 65px);
      font-size: 1.6rem;
    }
  }

  @media screen and (max-width: 389px) {
    div {
      /* iPhone SE */
      max-width: 252px;
    }
  }

  /* Desktop */
  @media screen and (min-width: 701px) {
    div {
      left: 394px;
      top: 10px;
      height: 44px;
      display: flex;
      align-items: center;
    }
  }
</style>
