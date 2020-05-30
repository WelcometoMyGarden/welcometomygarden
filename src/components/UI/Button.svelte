<script>
  export let type = null;
  export let href = null;
  export let isPrimary;

  export let target = null;
</script>

{#if href}
  <a class="button" class:is-primary={isPrimary} {href} {target}>
    <slot />
  </a>
{:else}
  <button class="button" {type}>
    <slot />
  </button>
{/if}

<style>
  a {
    text-decoration: none;
    display: inline-block;
  }
</style>
