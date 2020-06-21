<script>
  export let icon;
</script>

<i>
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
</style>
