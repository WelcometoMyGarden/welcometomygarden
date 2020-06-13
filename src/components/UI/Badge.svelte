<script>
  import Icon from './Icon.svelte';

  export let icon = '';
</script>

<div class="badge">
  <Icon name={icon} />
  <slot />
</div>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    background-color: var(--color-green-light);
    border-radius: var(--radius-xl);
    box-sizing: border-box;
    padding: var(--spacer-xs) var(--spacer-m);
    margin-top: var(--spacer-s);
    margin-left: var(--spacer-s);
  }
</style>
