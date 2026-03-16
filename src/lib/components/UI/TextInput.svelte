<script lang="ts">
  import { type Snippet } from 'svelte';
  import { fade } from 'svelte/transition';
  import { _ } from 'svelte-i18n';
  import Icon from './Icon.svelte';
  import { crossIcon } from '$lib/images/icons';
  import type { LocalizedMessage } from '$lib/util/translation-helpers';
  interface Props {
    id?: null | string;
    name: null | string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    value?: string;
    error?: string | LocalizedMessage | null;
    minLength?: null | number;
    maxLength?: null | number;
    testPattern?: null | string;
    isValid?: boolean;
    icon?: string | null;
    list?: null | string;
    autocomplete?: AutoFill;
    /**
     * Whether to trim this value automatically on blur
     */
    autotrim?: boolean;
    /**
     * Whether to ignore errors passed to this component visually.
     * Normally, the component reserves space on the bottom of a field for an
     * eventual error.
     */
    hideError?: boolean;
    /**
     * Whether to add some padding, to give a better appearnce on non-white backgrounds.
     */
    inset?: boolean;
    /**
     * A snippet intended for icon buttons which can process the field somehow
     */
    actionIcon?: Snippet;
    customError?: Snippet;
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
    autotrim = false,
    hideError = false,
    inset,
    actionIcon = undefined,
    customError = undefined,
    onblur,
    oninput
  }: Props = $props();

  let inputElement: HTMLInputElement | undefined = $state();
  let errorMessage = $derived(
    typeof error === 'string' ? error : error ? $_(error.key, error.options) : ''
  );
</script>

<!-- Contains the main input field & decorations on the top, + an error message container -->
<div class="outer-container notranslate" class:inset>
  <!-- Main input field container -->
  <div class="container">
    {#if icon}
      <div class="icon">
        <Icon {icon} />
      </div>
    {/if}
    <!-- The reason that the input field is a flex sibling to the icons on its sides,
      is that password managers (tested with Bitwarden) use the <input> field width to
      insert extra overlay controls on the right. If our icons are themselves overlayed
      with absolute positioning over the input (previous situation), there may be an overlap.
      -->
    <input
      bind:this={inputElement}
      bind:value
      {name}
      {placeholder}
      {required}
      {autocomplete}
      {list}
      {type}
      id={id || name}
      minlength={minLength}
      maxlength={maxLength}
      pattern={testPattern}
      class:invalid={!isValid}
      class="input"
      onblur={(e) => {
        if (autotrim && inputElement && value && typeof value === 'string') {
          // Note: it seems like browsers automatically trim the .value
          // result of a type="email" without visually showing the trimmed value
          const trimmedValue = value.trim();
          // Note: setting value directly does not seem to have (visual) effect
          inputElement.value = trimmedValue;
        }
        onblur?.(e);
      }}
      {oninput}
    />
    {#if !isValid}
      <div class="validation-icon" transition:fade>
        <Icon icon={crossIcon} />
      </div>
    {/if}
    {#if actionIcon}
      <div class="action-icon">
        {@render actionIcon?.()}
      </div>
    {/if}
  </div>
  {#if customError || !hideError}
    <div class="error" transition:fade>
      {#if errorMessage}
        <p class="error-message" transition:fade>{errorMessage}</p>
      {:else if customError}
        <p class="custom-error" transition:fade>{@render customError?.()}</p>
      {/if}
    </div>
  {/if}
</div>

<style>
  .outer-container {
    width: 100%;
  }

  .container {
    position: relative;
    width: 100%;
    display: flex;
    justify-items: center;
    align-items: center;

    border: none;
    border-bottom: 1px solid var(--color-green);
    transition: border 300ms ease-in-out;

    /* For consistent appearance. Now only needed on non-white backgrounds,
      like in the account deletion modal, where the field is shown on a beige background.
    */
    background: #fff;
  }
  .inset {
    margin-top: 0.75rem;
    border-radius: 3px;
    overflow: hidden;
  }
  .inset > .container {
    padding: 0 1rem;
  }

  .container:has(input:focus) {
    border-bottom: 1px solid var(--color-info);
  }

  input {
    border: none;
    padding: 1.2rem 0;
    font-size: 1.6rem;
    outline: none;
    width: 100%;
    position: relative;

    flex-grow: 1;
  }

  .icon,
  .action-icon {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .action-icon {
    right: 0.2rem;
    top: 1.1rem;
  }

  .icon {
    margin-right: 1rem;
  }
  .action-icon {
    margin-left: 0.5rem;
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
    font-size: 1.4rem;
    line-height: 3rem;
  }

  .error-message {
    color: var(--color-danger);
  }

  input:required {
    box-shadow: none !important;
  }
  input:invalid {
    box-shadow: none !important;
  }
</style>
