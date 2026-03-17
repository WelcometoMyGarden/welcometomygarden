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
     * Whether to reserve extra space below the field to show errors, or custom errors.
     * Will be ignored when a customError is given.
     */
    hideErrorSpace?: boolean;
    /**
     * Whether to show a border that changes color with focus
     */
    showBorder?: boolean;
    /**
     * Whether to add some padding and rounding, to give a better appearance on non-white backgrounds.
     */
    inset?: boolean;
    /**
     * A snippet intended for icon buttons which can process the field somehow
     */
    actionIcon?: Snippet;
    /**
     * A custom snippet which will be rendered as child of an error p tag.
     */
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
    hideErrorSpace = false,
    showBorder = true,
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
  <div class="container" class:show-border={showBorder}>
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
  {#if !hideErrorSpace || customError}
    <div class="error">
      {#if errorMessage || customError}
        <!-- We use 1 p tag like this to avoid temporary double tags when
           one fades out while the other fades in. A full workaround for that is likely complex, with transition
           delays to the new element fade-in, determining which is new and which is old, ...
           This will result in instant transitions if one of both was already present. Not perfect but acceptable. -->
        <p
          class={{ 'error-message': !!errorMessage, 'custom-error': !!customError }}
          transition:fade
        >
          {#if errorMessage}
            {errorMessage}
          {:else}
            {@render customError?.()}
          {/if}
        </p>
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

    /* For consistent appearance. Now only needed on non-white backgrounds,
      like in the account deletion modal, where the field is shown on a beige background.
    */
    background: #fff;
  }

  .container.show-border {
    border-bottom: 1px solid var(--color-green);
    transition: border 300ms ease-in-out;
  }

  .container.show-border:has(input:focus) {
    border-bottom: 1px solid var(--color-info);
  }

  .inset {
    margin-top: 0.75rem;
    border-radius: 3px;
    overflow: hidden;
  }
  .inset > .container {
    padding: 0 1rem;
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
