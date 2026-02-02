<script lang="ts">
  interface Props {
    type?: null | string;
    inverse?: boolean;
    fit?: boolean;
    medium?: boolean;
    small?: boolean;
    xsmall?: boolean;
    xxsmall?: boolean;
    disabled?: boolean;
    preventing?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    type = null,
    inverse = false,
    fit = true,
    medium = false,
    small = false,
    xsmall = false,
    xxsmall = false,
    disabled = false,
    preventing = false,
    onclick,
    children
  }: Props = $props();

  let clicked: boolean | undefined = $state();
  const click = (e: MouseEvent) => {
    if (preventing) {
      e.preventDefault();
      e.stopPropagation();
    }
    clicked = true;
    setTimeout(() => (clicked = false), 100);
    if (!disabled) return onclick?.(e);
  };
</script>

<button
  class="button"
  class:disabled
  onclick={click}
  class:fit
  class:medium
  class:small
  class:xsmall
  class:xxsmall
  class:inverse
  class:clicked
  {type}
>
  {@render children?.()}
</button>

<style>
  .button {
    width: initial;
    height: initial;
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
  }

  .small {
    padding: 1.2rem 1.8rem;
  }

  .xsmall {
    padding: 0.6rem 0.9rem;
  }

  .xxsmall {
    padding: 0.2rem 0.4rem;
  }

  .inverse {
    background-color: var(--color-white);
    color: var(--color-green);
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
