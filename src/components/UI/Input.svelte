<script>
  export let name;
  export let placeholder;
  export let required;
  export let value = '';
</script>

<input {name} {placeholder} {required} bind:value />

<style>
  input {
    padding: 0.8rem 0;
    border: none;
    border-bottom: 1px solid var(--color-gray);
    font-size: 1.6rem;
  }

  input:focus {
    padding: 0.8rem 0;
    border: none;
    border-bottom: 1px solid var(--color-gray);
    font-size: 1.6rem;
  }
</style>
