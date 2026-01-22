<script lang="ts">
  import ViteSVG from './ViteSVG.svelte';

  type Props = {
    /**
     * .svg are seen as a string, .jpg as an Object[] ?
     */
    icon: Object[] | string;
    whiteStroke?: boolean;
    greenStroke?: boolean;
    clickable?: boolean;
    inline?: boolean;
    class?: string;
  };
  let {
    icon,
    whiteStroke = false,
    greenStroke = false,
    clickable = false,
    inline = false,
    class: className
  }: Props = $props();
</script>

<i
  class:inline
  class:white-stroke={whiteStroke}
  class:green-stroke={greenStroke}
  class:clickable
  class={className}
>
  <ViteSVG {icon}></ViteSVG>
</i>

<style>
  i {
    width: 100%;
    height: 100%;
    justify-content: center;
    align-items: center;
    display: flex;
  }

  i.inline {
    display: inline-block;
    width: 1.2em;
    height: 1.2em;
  }

  i.clickable {
    cursor: pointer;
  }

  i > :global(svg) {
    width: 100% !important;
    height: auto !important;
    max-height: 100% !important;
  }

  i.white-stroke > :global(svg path) {
    stroke: white;
  }

  i.green-stroke > :global(svg path) {
    stroke: var(--color-green);
  }
</style>
