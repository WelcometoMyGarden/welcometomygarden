<script>
  export let type = null;
  export let href = null;
  export let primary = false;
  export let capitalize = false;
  export let outline = false;

  export let target = null;
</script>

{#if href}
  <a {href} {target} class:outline class:primary class:capitalize>
    <slot />
  </a>
{:else}
  <button class:outline class:primary class:capitalize {type}>
    <slot />
  </button>
{/if}

<style>
  a,
  button {
    color: var(--color-white);
    border: 0;
    padding: 0.8rem 1.4rem;
    border-radius: 0.4rem;
    font-weight: bold;
    background-color: var(--color-black);
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 300ms;
    font-size: 1.5rem;
    text-align: center;
  }

  a {
    text-decoration: none;
    display: inline-block;
  }

  .primary {
    background-color: var(--color-primary);
  }

  .primary:hover {
    background-color: var(--color-primary-active);
  }

  .capitalize {
    text-transform: uppercase;
  }

  .outline {
    background-color: transparent;
    border: 2px solid var(--color-white);
  }

  .outline:hover {
    background-color: var(--color-white);
    color: var(--color-dark-blue);
  }
</style>
