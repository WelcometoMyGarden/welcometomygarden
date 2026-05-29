<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
    top: number;
    right: number;
    children?: Snippet;
  }
  let { open, onclose, top, right, children }: Props = $props();
</script>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="scrim" onclick={onclose}></div>
  <div class="menu" role="menu" style:top="{top}px" style:right="{right}px">
    {@render children?.()}
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    z-index: 199;
  }

  .menu {
    position: fixed;
    z-index: 200;
    background: var(--color-white);
    border-radius: 1rem;
    box-shadow:
      0 0.4rem 2rem rgba(0, 0, 0, 0.12),
      0 0 0 1px rgba(0, 0, 0, 0.06);
    min-width: 20rem;
    overflow: hidden;
    animation: menu-in 140ms cubic-bezier(0.2, 0.7, 0.3, 1);
  }

  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-4px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
