<script lang="ts">
  interface Props {
    backgroundColor?: string | undefined;
    centered?: boolean | undefined;
    children?: import('svelte').Snippet;
  }

  let { backgroundColor = undefined, centered = undefined, children }: Props = $props();
</script>

<div style:background-color={backgroundColor} class:centered>
  {@render children?.()}
</div>

<style>
  div {
    width: 100%;
    border-radius: var(--marketing-block-border-radius);
    padding: 4rem;
    display: flex;
  }

  div.centered {
    flex-direction: column;
    align-content: center;
    justify-content: center;
    gap: 1.5rem;
    text-align: center;
  }

  div.centered :global(p) {
    max-width: 900px;
    margin: auto;
  }

  @media only screen and (max-width: 700px) {
    div {
      border-radius: 0;
      padding: 4rem 3rem;
    }
  }
</style>
