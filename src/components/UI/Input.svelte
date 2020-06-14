<script>
  export let id = null;
  export let name;
  export let type;
  export let placeholder;
  export let required;
  export let value = '';
  export let error = '';
  export let minLength = null;
  export let maxLength = null;
  export let testPattern = null;
  export let isValid = true;

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
    class:invalid={!isValid} />
  {#if !isValid}
    <div class="icon" transition:fade>
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
  input {
    padding: 1.2rem 0;
    border: none;
    border-bottom: 1px solid var(--color-green);
    transition: border 300ms ease-in-out;
    font-size: 1.6rem;
    outline: none;
    width: 100%;
    position: relative;
  }
  .icon {
    position: absolute;
    left: -2.2rem;
    top: 1.2rem;
    width: 2rem;
  }

  .icon :global(svg) {
    fill: var(--color-orange);
  }

  input:focus {
    border-bottom: 1px solid var(--color-info);
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
