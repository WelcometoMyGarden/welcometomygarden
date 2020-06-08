<script>
  export let isOpen = false;
</script>

<button on:click class:open={isOpen}>
  <span />
</button>

<style>
  button {
    border: 0;
    cursor: pointer;
    background: transparent;
    outline-offset: 0.5rem;
    outline-color: var(--color-green);
    height: 5rem;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: center;
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
    background: transparent;
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
