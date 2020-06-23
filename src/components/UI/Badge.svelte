<script>
  import Icon from './Icon.svelte';

  export let isSkeleton = false;
  export let icon = null;
</script>

<div class="badge" class:skeleton={isSkeleton} class:is-skeleton={isSkeleton}>
  {#if icon}
    <div class="icon">
      <Icon {icon} />
    </div>
  {/if}
  <slot />
</div>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    background-color: var(--color-green-light);
    border-radius: 4rem;
    box-sizing: border-box;
    padding: 0.5rem 1rem;
    margin-top: 0.8rem;
    margin-right: 0.8rem;
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
