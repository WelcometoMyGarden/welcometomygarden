<script lang="ts">
  import { Icon } from '$lib/components/UI';
  import chevronRight from '$lib/images/icons/chevron-right.svg?inline';

  interface Props {
    /** When set, renders an `<a>` linking here. Otherwise renders a `<button>`. */
    href?: string;
    /** Click handler for the `<button>` variant. Ignored when `href` is set. */
    onclick?: (e: MouseEvent) => void;
    ariaLabel?: string;
    title?: string;
  }

  let { href, onclick, ariaLabel, title }: Props = $props();
</script>

{#if href}
  <a class="back-button" {href} aria-label={ariaLabel} {title}>
    <Icon greenStroke rotate={180} icon={chevronRight} />
  </a>
{:else}
  <button type="button" class="back-button" {onclick} aria-label={ariaLabel} {title}>
    <Icon greenStroke rotate={180} icon={chevronRight} />
  </button>
{/if}

<style>
  .back-button {
    position: absolute;
    left: 2.5rem;
    width: 3.6rem;
    height: 3.8rem;
    /* Compensate for the non-centered internal svg, along with the height above */
    padding: 5px 5px 5px 0;
    border-radius: 0.6rem;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-green);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 150ms;
    flex-shrink: 0;
  }

  .back-button:hover {
    background: var(--color-gray);
  }

  @media screen and (min-width: 701px) {
    /* In the desktop listnav, show more spacing */
    .back-button {
      left: 4.9rem;
    }
  }
</style>
