<script>
  import { CheckIcon, XIcon } from 'svelte-feather-icons';

  export let name;
  export let placeholder;
  export let required;
  export let value = '';
  export let minLength, maxLength;

  let validity = null;

  const handleBlur = e => (validity = e.target.validity.valid);
  const handleInput = e => (validity = e.target.validity.valid || null);
</script>

<div class="input">
  <div class="icon">
    {#if validity === true}
      <CheckIcon size="16" />
    {:else if validity === false}
      <XIcon size="16" />
    {/if}
  </div>
  <input
    {name}
    {placeholder}
    {required}
    minlength={minLength}
    maxlength={maxLength}
    on:blur={handleBlur}
    on:input={handleInput}
    bind:value
    class:valid={validity === true}
    class:invalid={validity === false} />
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

  input:focus {
    border-bottom: 1px solid var(--color-green);
  }

  .valid {
    border-bottom: 1px solid green;
  }

  .invalid {
    border-bottom: 1px solid red;
  }
</style>
