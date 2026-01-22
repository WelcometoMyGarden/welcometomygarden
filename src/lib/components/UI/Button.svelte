<script lang="ts">
  import Text from './Text.svelte';

  import Icon from './Icon.svelte';
  import chevron from '$lib/images/icons/chevron-right.svg?inline';
  import Spinner from './Spinner.svelte';
  interface Props {
    type?: null | string;
    href?: null | string;
    /**
     * Dark foreground color
     */
    inverse?: boolean;
    uppercase?: boolean;
    initial?: boolean;
    fit?: boolean;
    fullWidth?: boolean;
    target?: null | string;
    medium?: boolean;
    small?: boolean;
    xsmall?: boolean;
    xxsmall?: boolean;
    disabled?: boolean;
    preventing?: boolean;
    orange?: boolean;
    danger?: boolean;
    arrow?: boolean;
    centered?: boolean;
    oneline?: boolean;
    /**
     * Shows a loading indicator on the button, instead of the main content
     */
    loading?: boolean;
    minWidth?: undefined | string;
    /** Whether this is a link-style button */
    link?: boolean;
    /** Apply an underline in the case of a link-style button*/
    underline?: boolean;
    bold?: boolean;
    /**
     * A new style used in the garden drawer.
     */
    gardenStyle?: boolean;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    type = null,
    href = null,
    inverse = false,
    uppercase = false,
    initial = false,
    fit = true,
    fullWidth = false,
    target = null,
    medium = false,
    small = false,
    xsmall = false,
    xxsmall = false,
    disabled = false,
    preventing = false,
    orange = false,
    danger = false,
    arrow = false,
    centered = false,
    oneline = false,
    loading = false,
    minWidth = undefined,
    link = false,
    underline = true,
    bold = true,
    gardenStyle = false,
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
    if (!_disabled) return onclick?.(e);
  };
  /**
   * Any loading button should also be disabled reactively
   */
  let _disabled = $derived(disabled || loading);
</script>

{#if href}
  <a
    class="button"
    class:uppercase
    class:initial
    class:disabled={_disabled}
    class:fit
    class:fullWidth
    class:small
    class:xsmall
    class:xxsmall
    class:medium
    class:inverse
    class:clicked
    class:orange
    class:danger
    class:arrow
    class:link
    class:centered
    class:bold
    class:underline
    class:loading
    class:oneline
    class:gardenStyle
    style:min-width={minWidth}
    {href}
    onclick={(e) => {
      if (_disabled || preventing) e.preventDefault();
      onclick?.(e);
    }}
    {target}
  >
    <Text class="btn-text" is="span">
      {@render children?.()}
    </Text>
    {#if arrow}
      <div class="arrow-icon"><Icon icon={chevron} /></div>
    {/if}
    {#if loading}
      <Spinner />
    {/if}
  </a>
{:else}
  <button
    class="button"
    class:initial
    class:disabled={_disabled}
    onclick={click}
    class:uppercase
    class:fit
    class:fullWidth
    class:medium
    class:small
    class:xsmall
    class:xxsmall
    class:inverse
    class:clicked
    class:orange
    class:danger
    class:arrow
    class:link
    class:centered
    class:bold
    class:underline
    class:loading
    class:oneline
    class:gardenStyle
    style:min-width={minWidth}
    {type}
  >
    <Text class="btn-text" is="span" weight="bold">
      {@render children?.()}
    </Text>
    {#if arrow}
      <div class="arrow-icon"><Icon icon={chevron} /></div>
    {/if}
    {#if loading}
      <Spinner />
    {/if}
  </button>
{/if}

<style>
  .button {
    position: relative;
    text-decoration: none;
    display: inline-block;
    background-color: var(--color-green);
    color: var(--color-white);
    cursor: pointer;
    border-radius: 0.6rem;
    border: 0.2rem solid var(--color-green);
    padding: 1.6rem 2.4rem;
    font-weight: bold;
    min-width: 25rem;
    transition: all 300ms ease-in-out;
    outline: 0;
  }

  .initial {
    /* Reset all styles, for example for icon buttons */
    all: initial;
  }

  /* Apply to both reset buttons (.initial) and normal buttons */
  .button {
    text-align: center;
    font-size: 1.8rem;
    cursor: pointer;
    font-family: var(--fonts-copy);
  }

  .orange {
    background-color: var(--color-orange-light);
    border: none;
    border-radius: 3rem;
    transition: all 0.3s;
    width: fit-content;
  }
  .orange:hover,
  .orange:active {
    background-color: var(--color-orange);
  }

  .danger {
    border-color: var(--color-danger);
    background-color: var(--color-danger);
  }

  .danger:hover {
    border-color: var(--color-black);
  }

  .centered {
    margin-left: auto;
    margin-right: auto;
    /* In case we're in a flexbox */
    align-self: center;
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
    border: none;
    text-transform: none;
  }

  .button.link:not(.loading) {
    background-color: unset;
  }

  .button.link :global(span) {
    position: relative;
    /* Inline is required to make border-bottom wrap onto multiple lines */
    display: inline;
    font-weight: 500;
  }

  .button.link.xsmall :global(span) {
    font-size: 1.5rem;
  }
  .button.link.small :global(span) {
    font-size: 1.6rem;
  }

  .button.link.oneline :global(span) {
    /* new css https://web-platform-dx.github.io/web-features-explorer/features/text-wrap-mode/ */
    text-wrap-mode: nowrap;
  }

  .button.link.bold :global(span) {
    font-weight: 700;
  }

  .button.link.underline.orange :global(span) {
    border-bottom: 2px solid var(--color-orange-light);
    transition: all 0.1s;
  }

  .button.link.underline:not(.orange) {
    /* Attempt to fit into text */
    text-decoration: underline;
    padding: 0 0.2rem;
  }
  .button.link.underline:not(.orange) > :global(span) {
    font-weight: 400;
  }

  .button.link:not(.underline) :global(span) {
    border-bottom: none;
  }

  .button.link.underline.orange:hover :global(span) {
    border-bottom: 0px solid transparent;
    transition: all 0.2s;
  }

  .button.link:not(.underline):hover :global(span) {
    font-weight: 600;
    transition: font-weight 0.3s;
  }

  .button.link.underline:not(.orange):hover {
    text-decoration: none;
  }

  .loading,
  .disabled,
  .disabled.danger,
  .disabled.orange {
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

  .fullWidth {
    width: 100%;
  }

  .fullWidth.arrow .arrow-icon {
    position: absolute;
    right: 1rem;
  }

  .inverse:not(.loading) {
    background-color: var(--color-white);
    color: var(--color-green);
  }

  .uppercase {
    text-transform: uppercase;
  }

  .button:not(.disabled):hover,
  .button:not(.disabled):focus {
    border-color: var(--color-orange);
  }

  .gardenStyle {
    border-radius: 4px;
    font-weight: 500;
    padding: 0.9rem 2.4rem;
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
    .button.link.small :global(span) {
      font-size: var(--paragraph-font-size);
    }
  }

  @media only screen and (max-width: 500px) {
    .button {
      font-size: 1.3rem;
    }
  }

  /* The idea behind these loading styles:
    Use `visibility: hidden` to make sure that the button size remains the same
    while loading (based on content length). The spinner tries to center itself
    using absolute positioning, and it scales itself to the `em` existing font-size
    of the button. */
  .loading.button {
    position: relative;
  }
  .loading :global(.btn-text),
  .loading :global(.arrow-icon) {
    visibility: hidden;
  }
</style>
