<script>
  export let isOpen = false;
</script>

<button on:click class:open={isOpen}>
  <span />
</button>

<style>
  button {
    display: none;
    z-index: 30;
    border: 0;
    cursor: pointer;
    background: transparent;
    outline-offset: 0.5rem;
    outline-color: var(--color-black);
    height: 4rem;
    user-select: none;
    margin-left: auto;
  }

  span {
    background-color: var(--color-black);
    display: block;
    height: 0.3rem;
    position: relative;
    transition: background-color 200ms ease-out;
    width: 3rem;
  }

  span:before,
  span:after {
    background: var(--color-black);
    content: '';
    display: block;
    height: 100%;
    position: absolute;
    transition: all 200ms ease-out;
    width: 100%;
  }

  span:before {
    top: 0.8rem;
  }
  span:after {
    top: -0.8rem;
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

  @media screen and (max-width: 980px) {
    button {
      display: block;
    }
    .open span:before,
    .open span:after {
      background: var(--color-black);
    }
  }
</style>
