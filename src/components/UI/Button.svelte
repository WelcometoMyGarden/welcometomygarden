<script>
  export let type = null;
  export let href = null;
  export let inverse = false;
  export let uppercase = false;
  export let fit = true;
  export let target = null;
  export let medium = false;
  export let small = false;
  export let disabled = false;

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let clicked;
  const click = e => {
    if (!disabled) return dispatch('click', e);
    clicked = true;
    setTimeout(() => (clicked = false), 100);
  };
</script>

{#if href}
  <a
    class="button"
    class:uppercase
    class:fit
    class:small
    class:medium
    class:inverse
    {href}
    {target}>
    <slot />
  </a>
{:else}
  <button
    class="button"
    class:disabled
    on:click={click}
    class:uppercase
    class:fit
    class:medium
    class:small
    class:inverse
    class:clicked
    {type}>
    <slot />
  </button>
{/if}

<style>
  .button {
    text-decoration: none;
    display: inline-block;
    background-color: var(--color-green);
    color: var(--color-white);
    cursor: pointer;
    border-radius: 0.6rem;
    border: 0.2rem solid var(--color-green);
    padding: 1.6rem 2.4rem;
    text-align: center;
    font-size: 1.8rem;
    font-weight: bold;
    cursor: pointer;
    min-width: 25rem;
    font-family: var(--fonts-copy);
    transition: all 300ms ease-in-out;
    outline: 0;
  }

  .disabled {
    background-color: var(--color-gray);
    border: 0.2rem solid var(--color-gray);
    color: var(--color-green);
    cursor: not-allowed;
  }

  .disabled.clicked {
    transform: translate3d(0, 0, 0);
    backface-visibility: hidden;
    perspective: 100rem;
    animation: shake 0.82s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  .button:focus,
  .button:active {
    outline: 0;
  }

  .button::-moz-focus-inner {
    border: 0;
  }

  .medium {
    padding: 1.4rem 2rem;
    font-size: 1.6rem;
  }

  .small {
    padding: 1.2rem 1.8rem;
    font-size: 1.5rem;
  }

  .fit {
    width: auto;
    min-width: auto;
  }

  .inverse {
    background-color: var(--color-white);
    color: var(--color-green);
  }

  .uppercase {
    text-transform: uppercase;
  }

  .button:not(.disabled):hover {
    border-color: var(--color-orange);
  }

  @keyframes shake {
    10%,
    90% {
      transform: translate3d(-1px, 0, 0);
    }

    20%,
    80% {
      transform: translate3d(2px, 0, 0);
    }

    30%,
    50%,
    70% {
      transform: translate3d(-4px, 0, 0);
    }

    40%,
    60% {
      transform: translate3d(4px, 0, 0);
    }
  }

  @media only screen and (max-width: 700px) {
    .button {
      font-size: 1.4rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .button {
      font-size: 1.3rem;
    }
  }
</style>
