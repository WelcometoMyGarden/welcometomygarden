<script>
  export let id = null;
  export let name;
  export let type;
  export let placeholder = null;
  export let required = false;
  export let value = '';
  export let error = '';
  export let minLength = null;
  export let maxLength = null;
  export let testPattern = null;
  export let isValid = true;
  export let icon = null;

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
    id={id || name}
    minlength={minLength}
    maxlength={maxLength}
    pattern={testPattern}
    on:blur
    on:input
    class:has-icon={!!icon}
    class:invalid={!!isValid}
    class="input" />
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
  <div class="error">
    {#if error}
      <p class="error-message">{error}</p>
    {/if}
  </div>
</div>

<style>
  .container {
    position: relative;
    width: 100%;
  }

  input.has-icon {
    padding-left: 2rem;
    position: relative;
  }

  .icon {
    width: 2rem;
    position: absolute;
    left: 0.2rem;
    top: calc(50% - 1rem);
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
    height: 3rem;
  }

  .error-message {
    font-size: 1.4rem;
    line-height: 3rem;
    color: var(--color-orange);
  }
</style>
