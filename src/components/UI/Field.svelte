<script>
  import Input from './Input.svelte';
  import Dropdown from './Dropdown.svelte';
  import Toggle from './Toggle.svelte';
  import Slider from './Slider.svelte';

  export let label;
  export let type;
  export let placeholder;
  export let required;
  export let options;
</script>

<div class="field">
  {#if label}
    <label class="label">
      {label}
      {#if required}*{/if}
    </label>
  {/if}
  {#if type === 'dropdown'}
    <Dropdown {placeholder} {options} {required} />
  {:else if type === 'toggle'}
    <Toggle {required} />
  {:else if type === 'slider'}
    <Slider placeholder} {required} />
  {:else}
    <Input {type} {placeholder} {required} />
  {/if}
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
