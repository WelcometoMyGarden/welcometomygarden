<script>
  export let type = null;
  export let href = null;

  export let target = null;
</script>

{#if href}
  <a class="button is-primary" {href} {target}>
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
