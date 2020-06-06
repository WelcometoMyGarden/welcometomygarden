<script>
  export let type;
  export let name;
  export let placeholder;
  export let required;
</script>

<input {type} {name} {placeholder} {required} />

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
