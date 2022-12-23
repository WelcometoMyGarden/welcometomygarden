<script lang="ts">
  import Text from './Text.svelte';

  export let type: null | string = null;
  export let href: null | string = null;
  export let inverse = false;
  export let uppercase = false;
  export let fit = true;
  export let target: null | string = null;
  export let medium = false;
  export let small = false;
  export let xsmall = false;
  export let xxsmall = false;
  export let disabled = false;
  export let preventing = false;
  export let orange = false;
  export let arrow = false;
  /** Whether this is a link-style button */
  export let link = false;

  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';
  import chevron from '$lib/images/icons/chevron-right.svg';

  const dispatch = createEventDispatcher();

  let clicked: boolean;
  const click = (e: MouseEvent) => {
    if (preventing) {
      e.preventDefault();
      e.stopPropagation();
    }
    clicked = true;
    setTimeout(() => (clicked = false), 100);
    if (!disabled) return dispatch('click', e);
  };
</script>

{#if href}
  <a
    class="button"
    class:uppercase
    class:disabled
    class:fit
    class:small
    class:xsmall
    class:xxsmall
    class:medium
    class:inverse
    class:clicked
    class:orange
    class:arrow
    class:link
    {href}
    on:click={(e) => {
      if (disabled) e.preventDefault();
      click(e);
    }}
    {target}
  >
    <Text is="span">
      <slot />
    </Text>
    {#if arrow}
      <div class="arrow-icon"><Icon icon={chevron} /></div>
    {/if}
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
    class:xsmall
    class:xxsmall
    class:inverse
    class:clicked
    class:orange
    class:arrow
    class:link
    {type}
  >
    <Text is="span" weight="bold">
      <slot />
    </Text>
    {#if arrow}
      <div class="arrow-icon"><Icon icon={chevron} /></div>
    {/if}
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

  .orange {
    background-color: var(--color-orange-light);
    border: none;
    border-radius: 3rem;
    transition: all 0.3s;
    /* TODO: add weight */
    font-weight: 600;
    width: fit-content;
  }
  .orange:hover,
  .orange:active {
    background-color: var(--color-orange);
  }

  .button.arrow {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem 2rem;
  }

  .button.arrow .arrow-icon {
    background-color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem;
    width: 3rem;
    height: 3rem;
    margin-left: 0.75rem;
  }
  /* TODO: fix the source icon instead */
  .button.arrow .arrow-icon :global(i) {
    transform: translateX(1px);
  }

  .button.link {
    background-color: unset;
    border: none;
    text-transform: none;
  }

  .button.link :global(span) {
    position: relative;
    display: inline-block;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .button.link :global(span)::after {
    content: '';
    display: block;
    width: 100%;
    height: 0.2rem;
    position: absolute;
    bottom: -0.4rem;
    background-color: var(--color-blue-light);
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

  .xsmall {
    padding: 0.6rem 0.9rem;
    font-size: 1rem;
  }

  .xxsmall {
    padding: 0.2rem 0.4rem;
  }

  .fit {
    width: fit-content;
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
