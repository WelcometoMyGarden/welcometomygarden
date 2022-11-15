<script>
  export let id = null;
  export let name;
  export let type = 'text';
  export let placeholder = '';
  export let required = false;
  export let value = '';
  export let error = '';
  export let minLength = null;
  export let maxLength = null;
  export let testPattern = null;
  export let isValid = true;
  export let icon = null;
  export let list = null;
  export let autocomplete = 'on';
  export let hideError = false;

  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import Icon from './Icon.svelte';
  import { crossIcon } from '@/images/icons';

  let inputElement;
  onMount(() => {
    inputElement.type = type;
  });
</script>

<div class="container">
  <input
    bind:this={inputElement}
    bind:value
    {name}
    {placeholder}
    {required}
    {autocomplete}
    {list}
    id={id || name}
    minlength={minLength}
    maxlength={maxLength}
    pattern={testPattern}
    on:blur
    on:input
    class:has-icon={!!icon}
    class:invalid={!!isValid}
    class="input"
  />
  {#if icon}
    <div class="icon">
      <Icon {icon} />
    </div>
  {/if}
  {#if !isValid}
    <div class="validation-icon" transition:fade>
      <Icon icon={crossIcon} />
    </div>
  {/if}
  {#if !hideError}
    <div class="error">
      {#if error}
        <p class="error-message">{error}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .container {
    position: relative;
    width: 100%;
  }

  input.has-icon {
    padding-left: 3rem;
    position: relative;
  }

  .icon {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 0.2rem;
    top: 1.1rem;
  }

  .validation-icon {
    position: absolute;
    left: -2.2rem;
    top: 1.2rem;
    width: 2rem;
  }

  .validation-icon {
    position: absolute;
    left: -2.2rem;
    top: 1.2rem;
    width: 2rem;
  }

  .validation-icon :global(svg) {
    fill: var(--color-orange);
  }

  .error {
    min-height: 3rem;
  }

  .error-message {
    font-size: 1.4rem;
    line-height: 3rem;
    color: var(--color-danger);
  }

  input:required {
    box-shadow: none !important;
  }
  input:invalid {
    box-shadow: none !important;
  }
</style>
