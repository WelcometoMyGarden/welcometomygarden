<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  interface Props {
    icon: string;
    /** 'card' (default): 3.2rem, white bg → dark green on hover/open
     *  'header': 3.6rem, transparent bg → light green on hover/active */
    variant?: 'card' | 'header';
    /** When provided, marks this as a menu trigger (adds aria-haspopup/aria-expanded). */
    open?: boolean;
    ariaLabel?: string;
    title?: string;
    onclick: (e: MouseEvent) => void;
    /** Optional children rendered inside the button (e.g. a badge dot). */
    children?: Snippet;
  }

  let {
    icon,
    variant = 'card',
    open,
    ariaLabel = 'More actions',
    title,
    onclick,
    children
  }: Props = $props();
</script>

<button
  class="chat-icon-btn"
  class:open
  class:header={variant === 'header'}
  aria-label={ariaLabel}
  {title}
  aria-haspopup={open !== undefined ? 'menu' : undefined}
  aria-expanded={open}
  {onclick}
>
  <Icon {icon} />
  {@render children?.()}
</button>

<style>
  .chat-icon-btn {
    position: relative;
    appearance: none;
    -webkit-appearance: none;
    border: none;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.6rem;
    transition:
      background 150ms,
      color 150ms;
  }

  /* ── Card variant (default) ──────────────────────────────── */
  .chat-icon-btn:not(.header) {
    width: 3.2rem;
    height: 3.2rem;
    background: var(--color-white);
    color: var(--color-green);
  }

  .chat-icon-btn:not(.header) :global(i) {
    width: 2rem;
    height: 2rem;
  }

  @media (any-hover: hover) {
    .chat-icon-btn:not(.header):hover {
      background: var(--color-green);
      color: var(--color-white);
    }
  }

  .chat-icon-btn:not(.header).open {
    background: var(--color-green);
    color: var(--color-white);
  }

  /* ── Header variant ──────────────────────────────────────── */
  .chat-icon-btn.header {
    width: 3.6rem;
    height: 3.6rem;
    background: none;
    color: var(--color-green);
  }

  .chat-icon-btn.header :global(i) {
    width: 2rem;
    height: 2rem;
  }

  @media (any-hover: hover) {
    .chat-icon-btn.header:hover {
      background: var(--color-green-light);
    }
  }

  @media (any-hover: none) {
    .chat-icon-btn.header:active {
      background: var(--color-green-light);
    }
  }
</style>
