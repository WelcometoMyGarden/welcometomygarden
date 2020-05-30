<script>
  export let type = null;
  export let href = null;
  export let capitalize = false;
  export let primary = false;
  export let loading = false;

  export let target = null;
</script>

{#if href}
  <a
    class="button"
    class:capitalize
    class:is-primary={primary}
    class:is-loading={loading}
    {href}
    {target}>
    <slot />
  </a>
{:else}
  <button
    class="button"
    class:capitalize
    class:is-primary={primary}
    class:is-loading={loading}
    {type}>
    <slot />
  </button>
{/if}

<style>
  a {
    text-decoration: none;
    display: inline-block;
  }

  .capitalize {
    text-transform: uppercase;
  }
</style>
