<script>
  import Input from './Input.svelte';
  import Dropdown from './Dropdown.svelte';
  import Toggle from './Toggle.svelte';
  import Slider from './Slider.svelte';

  import {
    BonfireIcon,
    ElectrictiyIcon,
    ShowerIcon,
    TentIcon,
    ToiletIcon,
    WaterIcon
  } from '../../images/facilities';

  const icons = {
    bonfire: BonfireIcon,
    electricity: ElectrictiyIcon,
    shower: ShowerIcon,
    tent: TentIcon,
    toilet: ToiletIcon,
    water: WaterIcon
  };

  export let label = '';
  export let name = '';
  export let type = 'text';
  export let icon = null;
  export let placeholder = '';
  export let required = false;
  let testPattern, testTitle;
  export let minLength, maxLength;
  export let min, max;
  export { testPattern as pattern };
  export { testTitle as title };
  export let options = [];
  let className;
  export { className as class };
  export let value = '';
</script>

<div class="field" class:className>
  {#if label}
    <label class="label">
      {#if icon}
        <div class="label-icon">
          <svelte:component this={icons[icon]} />
        </div>
      {/if}
      {label}
      {#if required}*{/if}
    </label>
  {/if}
  {#if type === 'dropdown'}
    <Dropdown {name} {placeholder} {options} {required} bind:value />
  {:else if type === 'toggle'}
    <Toggle {name} {required} bind:value />
  {:else if type === 'slider'}
    <Slider {name} {required} {min} {max} bind:value />
  {:else if type === 'number'}
    <Input
      {name}
      type="number"
      {placeholder}
      {min}
      {max}
      {required}
      {testPattern}
      {testTitle}
      bind:value />
  {:else}
    <Input
      {name}
      {type}
      {placeholder}
      {required}
      {minLength}
      {maxLength}
      {testPattern}
      {testTitle}
      bind:value />
  {/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    margin: 0.8rem 0;
  }

  .label {
    display: flex;
    align-items: center;
    padding: 0.8rem 0;
    font-weight: bold;
  }

  .label-icon {
    margin-right: 1rem;
  }
</style>
