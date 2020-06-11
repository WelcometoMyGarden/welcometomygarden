<script>
  export let name;
  export let placeholder;
  export let options = [];
  export let required;
  export let value = '';

  let validity = null;

  const handleBlur = e => (validity = e.target.validity.valid || null);
</script>

<select
  {name}
  bind:value
  {required}
  on:blur={handleBlur}
  class:valid={validity === true}
  class:invalid={validity === false}>
  <option value="">{placeholder}</option>
  {#each options as option}
    <option value={option}>{option}</option>
  {/each}
</select>

<style>
  select {
    padding: 1rem;
  }

  .valid {
    border: 1px solid green;
  }

  .invalid {
    border: 1px solid red;
  }
</style>
