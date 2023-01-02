<script lang="ts">
  export let icon: string;
  export let whiteStroke = false;
  export let greenStroke = false;
</script>

<i class:white-stroke={whiteStroke} class:green-stroke={greenStroke}>
  {@html icon}
</i>

<style>
  i {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
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
