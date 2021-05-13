<script>
  // TODO make this dynamic
  export let type = 'decimal';

  export let position = 'inside';
</script>

<ol style="list-style: {type} {position};">
  <slot />
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
