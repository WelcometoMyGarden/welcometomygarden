<script>
  import Input from './Input.svelte';

  export let label;
  export let type;
  export let placeholder;
  export let required;
</script>

<div class="field">
  {#if label}
    <label class="label">
      {label}
      {#if required}*{/if}
    </label>
  {/if}
  <Input class="input" {type} {placeholder} {required} />
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    margin: 0.8rem 0;
  }

  .label {
    padding: 0.8rem 0;
    font-weight: bold;
  }
</style>
