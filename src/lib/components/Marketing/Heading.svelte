<script lang="ts">
  interface Props {
    caption?: string | undefined;
    id?: string | undefined;
    centered?: boolean;
    children?: import('svelte').Snippet;
  }

  let { caption = undefined, id = undefined, centered = false, children }: Props = $props();
</script>

<div class="heading" class:centered>
  {#if caption}
    <span class="caption" {id}>{caption}</span>
  {/if}
  <span></span>
  <h2>{@render children?.()}</h2>
</div>

<style>
  span {
    margin-bottom: 1.2rem;
    display: inline-block;
  }

  .centered {
    margin: 0 auto;
    text-align: center;
  }
</style>
