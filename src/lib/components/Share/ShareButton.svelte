<!-- @component
  One-off button used inside `ShareModal.svelte`. It mirrors the visual language
  of the shared `Button.svelte` (green fill / outlined variants, same radius and
  border), but adds a leading icon next to a centered label — something the
  shared button doesn't support. Kept as a sibling of the modal on purpose: it's
  specific to the share sheet's layout and colouring rules.
-->
<script lang="ts">
  import { Icon } from '$lib/components/UI';

  interface Props {
    icon: object[] | string;
    /** Filled (primary) style vs. outlined. */
    primary?: boolean;
    /**
     * Overrides the icon colour (e.g. a brand colour). Defaults to the button's
     * foreground colour (white on primary, green on outlined).
     */
    iconColor?: string;
    href?: string | null;
    target?: string | null;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    icon,
    primary = false,
    iconColor,
    href = null,
    target = null,
    onclick,
    children
  }: Props = $props();
</script>

{#if href}
  <a class="share-button" class:primary {href} {target} rel="noopener noreferrer" {onclick}>
    <span class="icon" style:color={iconColor}><Icon {icon} /></span>
    <span class="label">{@render children?.()}</span>
  </a>
{:else}
  <button class="share-button" class:primary type="button" {onclick}>
    <span class="icon" style:color={iconColor}><Icon {icon} /></span>
    <span class="label">{@render children?.()}</span>
  </button>
{/if}

<style>
  .share-button {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.2rem;
    padding: 1.4rem 2rem;
    border-radius: 0.6rem;
    border: 0.2rem solid var(--color-green);
    background-color: var(--color-white);
    color: var(--color-green);
    font-family: var(--fonts-copy);
    font-size: 1.6rem;
    font-weight: bold;
    cursor: pointer;
    text-decoration: none;
    transition:
      background-color 200ms ease-in-out,
      border-color 200ms ease-in-out;
  }

  .share-button.primary {
    background-color: var(--color-green);
    color: var(--color-white);
  }

  /* Use :focus-visible (not :focus) so a mouse click doesn't leave the hover
     style stuck on the button after pressing; keyboard focus is still styled. */

  /* Outline: subtle green tint fill — keeps the green/brand icons legible. */
  .share-button:hover,
  .share-button:focus-visible {
    background-color: var(--color-green-light-2);
    outline: 0;
  }

  /* Primary (filled): darken on hover instead. */
  .share-button.primary:hover,
  .share-button.primary:focus-visible {
    background-color: var(--color-green-dark);
    border-color: var(--color-green-dark);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    flex-shrink: 0;
  }

  .label {
    text-align: center;
  }

  @media only screen and (max-width: 700px) {
    .share-button {
      font-size: 1.4rem;
    }
  }
</style>
