<script lang="ts">
  interface Props {
    gardenStyle?: boolean;
    children?: import('svelte').Snippet;
  }

  let { gardenStyle = false, children }: Props = $props();
</script>

<!-- @component
Badge (chip) to indicate in a menu item that it refers to a new feature.
 -->
<div class="badge" class:gardenStyle>
  {@render children?.()}
</div>

<style>
  div {
    display: inline-flex;
    justify-content: center;
    border-radius: 0.5rem;
    background-color: var(--color-orange-light);
    padding: 0 0.8rem;
    margin-right: 0.8rem;
    color: var(--color-white);
    height: min-content;
    width: fit-content;
    line-height: 1;
    /* relative to context */
    padding: 0.4em 0.8rem;
  }

  .gardenStyle {
    margin-left: 0.4rem;
    background-color: rgb(from var(--color-orange-light) r g b / 0.2);
    color: var(--color-orange-light);
    font-weight: 500;
    border-radius: 100px;
    padding: 8px 10px;
  }
</style>
