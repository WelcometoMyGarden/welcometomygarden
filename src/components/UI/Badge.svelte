<script>
  import Icon from './Icon.svelte';

  export let icon;
</script>

<div class="badge">
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
    margin-left: 0.8rem;
  }

  .icon {
    width: 2rem;
    height: 1.5rem;
  }
</style>
