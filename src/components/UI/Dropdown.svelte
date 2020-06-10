<script>
  export let name;
  export let placeholder;
  export let options = [];
  export let required;
  export let value = '';
</script>

<select {name} bind:value>
  <option value="">{placeholder}</option>
  {#each options as option}
    <option value={option}>{option}</option>
  {/each}
</select>

<style>
  select {
    padding: 1rem;
  }
</style>
