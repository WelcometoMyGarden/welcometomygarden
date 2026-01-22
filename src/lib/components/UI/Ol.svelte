<script lang="ts">
  

  interface Props {
    // TODO make this dynamic
    type?: string;
    position?: string;
    children?: import('svelte').Snippet;
  }

  let { type = 'decimal', position = 'inside', children }: Props = $props();
</script>

<ol style="list-style: {type} {position};">
  {@render children?.()}
</ol>

<style>
  ol :global(li) {
    padding: 10px 0;
  }

  ol :global(li.h3) {
    font-size: 2rem;
  }

  ol :global(li.h4) {
    font-size: 1.6rem;
    font-weight: bold;
  }

  ol :global(li .title) {
    display: inline;
  }
</style>
