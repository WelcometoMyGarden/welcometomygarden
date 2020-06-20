<script>
  export let type = null;
  export let href = null;
  export let inverse = false;
  export let uppercase = false;
  export let fit = true;
  export let target = null;
  export let moveUp = false;
</script>

{#if href}
  <a class="button" class:uppercase class:fit class:inverse class:moveUp {href} {target}>
    <slot />
  </a>
{:else}
  <button class="button" class:uppercase class:fit class:inverse class:moveUp {type}>
    <slot />
  </button>
{/if}

<style>
  .button {
    text-decoration: none;
    display: inline-block;
    background-color: var(--color-green);
    color: var(--color-white);
    cursor: pointer;
    border-radius: 0.6rem;
    border: 0.2rem solid var(--color-green);
    padding: 1.6rem 2.4rem;
    font-size: 1.8rem;
    font-weight: bold;
    cursor: pointer;
    width: 25rem;
    font-family: var(--fonts-copy);
    transition: border-color 300ms ease-in-out;
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

  .button:hover {
    border-color: var(--color-orange);
  }

  @media only screen and (max-width: 700px) {
    .button {
      font-size: 1.4rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .button {
      font-size: 1.3rem;
    }
  }
</style>
