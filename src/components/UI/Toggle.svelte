<script>
  export let name;
  export let value = false;
</script>

<div class="toggle">
  <input id={name} {name} type="checkbox" bind:checked={value} />
  <label for={name} />
</div>

<style>
  .toggle {
    flex: 1;
    display: flex;
  }

  input {
    display: none;
  }

  input:checked + label {
    background: var(--color-success);
  }

  label {
    display: block;
    cursor: pointer;
    padding: 1.6rem;
    border: 1px solid var(--color-gray);
  }
</style>
