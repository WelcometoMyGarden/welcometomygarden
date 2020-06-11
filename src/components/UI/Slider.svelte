<script>
  export let name;
  export let required;
  export let min = '0';
  export let max = '10';
  export let value = 0;
</script>

<input class="input" type="number" bind:value {min} {max} />
<input {name} class="slider" type="range" bind:value {min} {max} {required} />

<style>
  .input {
    padding: 1rem;
  }
</style>
