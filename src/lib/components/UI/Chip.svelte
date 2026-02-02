<script lang="ts">
  import Icon from './Icon.svelte';

  interface Props {
    isSkeleton?: boolean;
    icon?: string | null;
    children?: import('svelte').Snippet;
  }

  let { isSkeleton = false, icon = null, children }: Props = $props();
</script>

<div class="chip" class:skeleton={isSkeleton} class:is-skeleton={isSkeleton}>
  {#if icon}
    <div class="icon">
      <Icon {icon} />
    </div>
  {/if}
  {@render children?.()}
</div>

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    background-color: var(--color-green-light);
    border-radius: 4px;
    box-sizing: border-box;
    padding: 0.4rem 0.6rem;
    font-size: 1.4rem;
  }

  .is-skeleton {
    width: 7rem;
    height: 3rem;
  }

  .icon {
    width: 2rem;
    height: 1.5rem;
  }
</style>
