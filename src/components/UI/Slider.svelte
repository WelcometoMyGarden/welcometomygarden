<script>
  let value = 0;
  let min = '0';
  let max = '10';
</script>

<input class="input" type="number" bind:value {min} {max} />
<input class="slider" type="range" bind:value {min} {max} />

<style>
  .input {
    padding: 1rem;
  }
</style>
