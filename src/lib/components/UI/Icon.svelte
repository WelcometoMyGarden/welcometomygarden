<script lang="ts">
  export let icon: string;
  export let whiteStroke = false;
  export let greenStroke = false;
  export let clickable = false;
  export let inline = false;
</script>

<i class:inline class:white-stroke={whiteStroke} class:green-stroke={greenStroke} class:clickable>
  {@html icon}
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
