<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import Icon from './Icon.svelte';
  import { crossIcon } from '$lib/images/icons';
  interface Props {
    id?: null | string;
    name: null | string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    value?: string;
    error?: string;
    minLength?: null | number;
    maxLength?: null | number;
    testPattern?: null | string;
    isValid?: boolean;
    icon?: string | null;
    list?: null | string;
    autocomplete?: string;
    hideError?: boolean;
    onblur?: (e: FocusEvent) => void;
    oninput?: (e: Event) => void;
  }

  let {
    id = null,
    name,
    type = 'text',
    placeholder = '',
    required = false,
    // Note: can not have a default value, since
    // some component users will overwrite it with `undefined`,
    // which is invalid in Svelte 5
    value = $bindable(),
    error = '',
    minLength = null,
    maxLength = null,
    testPattern = null,
    isValid = true,
    icon = null,
    list = null,
    autocomplete = 'on',
    hideError = false,
    onblur
  }: Props = $props();

  let inputElement: HTMLInputElement = $state();
  onMount(() => {
    inputElement.type = type;
  });
</script>

<div class="container notranslate">
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
    {onblur}
    {oninput}
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
