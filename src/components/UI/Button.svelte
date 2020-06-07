<script>
  export let type = null;
  export let href = null;
  export let inverse = false;
  export let uppercase = false;
  export let fit = true;
  export let target = null;
</script>

{#if href}
  <a class:uppercase class:fit class:inverse {href} {target}>
    <slot />
  </a>
{:else}
  <button class:uppercase class:fit class:inverse {type}>
    <slot />
  </button>
{/if}

<style>
  a,
  button {
    text-decoration: none;
    display: inline-block;
    background-color: var(--color-green);
    color: var(--color-white);
    cursor: pointer;
    border-radius: 0.6rem;
    border: 0.2rem solid var(--color-green);
    padding: 1.6rem 2.4rem;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    width: 25rem;
  }

  .fit {
    width: fit-content;
  }

  .inverse {
    background-color: var(--color-white);
    color: var(--color-green);
  }

  .uppercase {
    text-transform: uppercase;
  }
</style>
