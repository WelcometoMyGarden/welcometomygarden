<script>
  import { CheckIcon, XIcon } from 'svelte-feather-icons';

  export let name;
  export let type;
  export let placeholder;
  export let required;
  export let value = '';
  export let error = '';
  export let minLength, maxLength;
  export let testPattern = null;
  export let testTitle;

  let validity = null;

  const handleBlur = e => {
    validity = e.target.validity.valid;
    error = e.target.validationMessage;
  };
  const handleInput = e => {
    value = e.target.value;
    validity = e.target.validity.valid || null;
    if (error) error = e.target.validationMessage;
  };
</script>

<div class="input">
  <input
    {name}
    {type}
    {placeholder}
    {required}
    minlength={minLength}
    maxlength={maxLength}
    pattern={testPattern}
    title={testTitle}
    on:blur={handleBlur}
    on:input={handleInput}
    class:valid={validity === true}
    class:invalid={validity === false} />
  <div class="icon">
    {#if validity === true}
      <CheckIcon size="16" />
    {:else if validity === false}
      <XIcon size="16" />
    {/if}
  </div>
</div>
<div class="error">
  {#if error}
    <p class="error-message">{error}</p>
  {/if}
</div>

<style>
  .input {
    display: flex;
  }

  .icon {
    position: absolute;
    left: 1.2rem;
    margin: 1.2rem;
    padding-top: 0.2rem;
  }

  :global(input.valid:focus + .icon > svg) {
    stroke: var(--color-success);
  }

  :global(input.invalid + .icon > svg) {
    stroke: var(--color-warning);
  }

  input {
    padding: 1.2rem 0;
    border: none;
    border-bottom: 1px solid var(--color-gray);
    font-size: 1.6rem;
    outline: none;
  }

  input:optional {
    font-style: italic;
  }

  input.valid:focus {
    border-bottom: 1px solid var(--color-success);
  }

  input.invalid {
    border-bottom: 1px solid var(--color-warning);
  }

  input.valid:focus,
  input.valid:focus::placeholder {
    color: var(--color-success);
  }

  input.invalid,
  input.invalid::placeholder {
    color: var(--color-warning);
  }

  .error {
    display: flex;
    min-height: 3.2rem;
  }

  .error-message {
    font-style: italic;
    font-size: 1.4rem;
    margin: auto 0;
    color: var(--color-warning);
  }
</style>
