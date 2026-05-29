<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    onclick: () => void;
    children: Snippet;
  }
  let { onclick, children }: Props = $props();

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onclick();
  };
</script>

<button class="item" role="menuitem" onclick={handleClick}>
  {@render children()}
</button>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 1.2rem;
    width: 100%;
    padding: 1.3rem 1.6rem;
    background: none;
    border: none;
    border-bottom: 1px solid #f0eee9;
    cursor: pointer;
    text-align: left;
    font: 500 1.4rem / 1 var(--fonts-copy);
    color: var(--color-green);
    transition: background 150ms;
  }

  .item:last-child {
    border-bottom: none;
  }

  .item:hover {
    background: var(--color-beige-light);
  }

  .item :global(i) {
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
  }
</style>
