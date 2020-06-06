<script>
  export let value = 0;
  export let min = '0';
  export let max = '10';
  export let name;
</script>

<input class="input" type="number" bind:value {min} {max} />
<input {name} class="slider" type="range" bind:value {min} {max} />

<style>
  .input {
    padding: 1rem;
  }
</style>
