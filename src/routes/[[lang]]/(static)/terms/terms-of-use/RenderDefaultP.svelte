<script lang="ts">
  export let content: string | undefined;
</script>

<!-- @component render a <p> by default, otherwise the content as HTLM if it starts with a HTML tag -->
{#if content?.match(/^<[a-zA-Z0-9]+>/i)}
  {@html content}
{:else if content}
  <p>{@html content}</p>
{/if}

<style>
  :global(ol.terms-html) {
    list-style: decimal inside;
  }
</style>
