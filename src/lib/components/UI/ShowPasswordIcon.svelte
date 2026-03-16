<script lang="ts">
  import { hideIcon, showIcon } from '$lib/images/icons';
  import IconButton from './IconButton.svelte';
  let { isPasswordVisible = $bindable() } = $props();
</script>

<!-- Note: type="button" is important, otherwise the default will be type="submit", leading to unintended effects -->
<IconButton
  icon={isPasswordVisible ? hideIcon : showIcon}
  iconClass="show-password-icon"
  alt={isPasswordVisible ? 'Hide password' : 'Show password'}
  type="button"
  onclick={() => {
    isPasswordVisible = !isPasswordVisible;
  }}
></IconButton>

<style>
  :global(button .show-password-icon) {
    fill: var(--color-darker-gray);
    /* Value from Stripe's sign-in */
    transition: fill 0.24s;
  }
  :global(button .show-password-icon:hover) {
    fill: var(--color-green-dark);
  }
</style>
