<script>
  export let isOpen = false;
  export let hamburger = null;
</script>

<button bind:this={hamburger} class="button-container" on:click class:open={isOpen}>
  <span />
</button>

<style>
  button {
    height: 5rem;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  button:focus {
    outline-offset: 1rem;
    outline: 1px dotted var(--color-green);
  }

  span {
    background-color: var(--color-green);
    display: block;
    height: 0.3rem;
    position: relative;
    transition: background-color 200ms ease-out;
    width: 3rem;
  }

  span:before,
  span:after {
    background: var(--color-green);
    content: '';
    display: block;
    height: 100%;
    position: absolute;
    transition: all 200ms ease-out;
    width: 100%;
  }

  span:before {
    top: 1rem;
  }
  span:after {
    top: -1rem;
  }

  .open span {
    background: transparent !important;
  }

  .open span:before {
    transform: rotate(-45deg);
    top: 0;
  }

  .open span:after {
    transform: rotate(45deg);
    top: 0;
  }

  .open span:before,
  .open span:after {
    background: var(--color-green);
  }
</style>
