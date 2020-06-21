<script>
  export let name;
  export let placeholder;
  export let options = [];
  export let required;
  export let value = '';

  let validity = null;

  const handleBlur = e => (validity = e.target.validity.valid || null);
</script>

<div class="input">
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
</div>

<style>
  .input {
    display: flex;
  }

  .icon {
    position: absolute;
    left: 1.2rem;
    margin: 1.2rem;
    padding-top: 0.2rem;
  }

  select {
    padding: 1rem;
  }

  .valid {
    border-bottom: 1px solid var(--color-success);
  }

  .invalid {
    border-bottom: 1px solid var(--color-warning);
  }
</style>
