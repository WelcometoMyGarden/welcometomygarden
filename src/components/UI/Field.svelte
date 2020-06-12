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
  export let info = '';
  export let placeholder = '';
  export let required = false;
  let testPattern, testTitle;
  export { testPattern as pattern };
  export { testTitle as title };
  export let minLength, maxLength;
  export let min, max;
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
  <div class="info">
    {#if info}
      <p class="info-message">{info}</p>
    {/if}
  </div>
  {#if type === 'dropdown'}
    <Dropdown {name} {placeholder} {options} {required} bind:value />
  {:else if type === 'toggle'}
    <Toggle {name} bind:value />
  {:else if type === 'slider'}
    <Slider {name} {required} {min} {max} bind:value />
  {:else}
    <Input
      {name}
      {type}
      {placeholder}
      {required}
      {minLength}
      {maxLength}
      {min}
      {max}
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

  .info {
    display: flex;
    min-height: 3.2rem;
  }

  .info-message {
    font-size: 1.4rem;
    margin: auto 0;
  }
</style>
