<script>
  export let checked = false;
</script>

<div class="toggle">
  <input id="toggle" name="toggle" type="checkbox" bind:checked />
  <label for="toggle" />
</div>

<style>
  .toggle {
    position: relative;
  }

  input {
    display: none;
  }

  input:checked + label {
    background: var(--color-green-light);
  }

  input:checked + label:before {
    left: 50%;
    right: 0;
  }

  label {
    display: block;
    cursor: pointer;
    padding: 1.6rem;
    border: 1px solid var(--color-gray);
  }

  label:before {
    content: '';
    padding: 1.6rem;
    position: absolute;
    bottom: 0;
    left: 0;
    right: 50%;
    background: var(--color-gray);
    border: 1px solid var(--color-gray);
  }
</style>
