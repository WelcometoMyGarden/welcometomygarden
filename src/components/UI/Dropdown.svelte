<script>
  export let name;
  export let selected = '';
  export let options = [];
</script>

<select {name} bind:value={selected}>
  {#each options as option}
    <option value={option}>{option}</option>
  {/each}
</select>

<style>
  select {
    padding: 1rem;
  }
</style>
