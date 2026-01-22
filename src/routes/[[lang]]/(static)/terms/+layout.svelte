<script lang="ts">
  interface Props {
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="content">
  {@render children?.()}
</div>

<style>
  .content {
    max-width: 85rem;
    margin: 0 auto;
    padding: 0 30px;
  }

  .content :global(h2) {
    font-size: 2.4rem;
    line-height: 3.6rem;
    margin: 1.2rem 0 1.6rem 0;
    padding: 1.2rem 0;
    border-bottom: 0.2rem solid var(--color-orange);
  }

  .content :global(h3:not(.t3)) {
    font-size: 2rem;
    line-height: 3.2rem;
    margin: 1.2rem 0;
    font-family: var(--fonts-copy);
  }

  .content :global(h4:not(.t4)),
  .content :global(.t3) {
    font-size: 1.6rem;
    line-height: 3.2rem;
    margin: 1.2rem 0;
    font-weight: bold;
  }

  .content :global(p) {
    margin: 1.2rem 0.2rem;
  }

  .content :global(.bold) {
    font-weight: 800;
  }

  .content :global(.line-break) {
    height: 0.2rem;
    background: var(--color-orange);
    margin: 2.4rem 19%;
  }

  .content :global(.info) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--color-green-light);
    padding: 1.6rem;
    margin-top: 1.6rem;
    border-radius: 1.2rem 1.2rem 0 0;
  }

  .content :global(.info-item) {
    border-left: 0.2rem solid var(--color-green-light);
    padding: 0.8rem 1.6rem;
  }

  .content :global(small) {
    font-size: 1.2rem;
    font-family: var(--fonts-copy);
    font-style: italic;
  }

  .content :global(a) {
    color: var(--color-orange);
  }
</style>
