<script>
  export let name;
  export let placeholder;
  export let required;
  export let value = '';
</script>

<input {name} type="text" {placeholder} {required} bind:value />

<style>
  input {
    padding: 1.2rem 0;
    border: none;
    border-bottom: 1px solid var(--color-gray);
    font-size: 1.6rem;
    outline: none;
  }

  input:focus {
    border-bottom: 1px solid var(--color-green);
  }
</style>
