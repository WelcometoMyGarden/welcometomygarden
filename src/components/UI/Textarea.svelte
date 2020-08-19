<script>
  import { createEventDispatcher } from 'svelte';
  export let id = null;
  export let name;
  export let placeholder = '';
  export let required = false;
  export let value = '';
  export let error = '';
  export let minLength = null;
  export let maxLength = null;
  export let testPattern = null;
  export let autocomplete = 'on';
  export let rows = 1;
  export let cols = null;
  export let disabled = false;
  export let readonly = false;
  export let spellcheck = false;
  export let grow = false;
  export let resize = grow ? 'none' : undefined;

  const dispatch = createEventDispatcher();
  let elt = null;

  const autogrow = () => {
    dispatch('input');
    if (!grow) return;
    elt.style.height = 'auto';
    elt.style.height = elt.scrollHeight + 'px';
  };
</script>

<div class="container">
  <textarea
    bind:this={elt}
    id={id || name}
    {name}
    {placeholder}
    {required}
    minlength={minLength}
    maxlength={maxLength}
    pattern={testPattern}
    {autocomplete}
    {rows}
    {cols}
    {disabled}
    {readonly}
    {spellcheck}
    class:grow
    bind:value
    style="resize: {resize};"
    on:input={autogrow}
    on:blur
    {...$$restProps} />
  <div class="error">
    {#if error}
      <p class="error-message">{error}</p>
    {/if}
  </div>
</div>

<style>
  .container {
    width: 100%;
  }

  textarea {
    width: 100%;
    border-width: 0 0 1px 0;
  }

  .grow {
    overflow: hidden;
    box-sizing: border-box;
  }

  .error {
    min-height: 3rem;
  }

  .error-message {
    font-size: 1.4rem;
    line-height: 3rem;
    color: var(--color-danger);
  }

  textarea:required {
    box-shadow: none !important;
  }

  textarea:invalid {
    box-shadow: none !important;
  }
</style>
