<script lang="ts">
  import { fly } from 'svelte/transition';
  import { cubicOut, cubicIn } from 'svelte/easing';

  interface Props {
    message: string;
    undoLabel: string;
    onundo: () => void;
  }
  let { message, undoLabel, onundo }: Props = $props();
</script>

<div
  class="toast-wrap"
  role="status"
  aria-live="polite"
  in:fly={{ y: 16, duration: 220, easing: cubicOut }}
  out:fly={{ y: 40, duration: 200, easing: cubicIn }}
>
  <div class="toast">
    <span>{message}</span>
    <button class="toast-undo" onclick={onundo}>{undoLabel}</button>
  </div>
</div>

<style>
  .toast-wrap {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 2.2rem;
    display: flex;
    justify-content: center;
    padding: 0 1.6rem;
    box-sizing: border-box;
    pointer-events: none;
    z-index: 20;
  }

  .toast {
    pointer-events: auto;
    display: inline-flex;
    align-items: center;
    gap: 1.8rem;
    max-width: 100%;
    box-sizing: border-box;
    padding: 1.2rem 1.6rem 1.2rem 2rem;
    background: var(--color-green);
    color: var(--color-white);
    border-radius: var(--radius-button, 0.6rem);
    box-shadow: 0 0.4rem 1.6rem rgba(0, 0, 0, 0.18);
    font-size: 1.4rem;
  }

  .toast-undo {
    background: rgba(255, 255, 255, 0.16);
    border: none;
    color: var(--color-white);
    font: 600 1.35rem / 1 var(--fonts-copy);
    cursor: pointer;
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius-button, 0.6rem);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    transition: background 150ms;
    flex-shrink: 0;
  }

  .toast-undo:hover {
    background: rgba(255, 255, 255, 0.24);
  }

  @media screen and (max-width: 700px) {
    .toast-wrap {
      bottom: 8rem;
    }
  }
</style>
