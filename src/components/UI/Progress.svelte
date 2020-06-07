<script>
  export let active = false;
  export let speed = 0;

  import NProgress from 'nprogress';

  $: if (speed) NProgress.configure({ trickleSpeed: speed });

  $: {
    if (active) NProgress.start();
    else NProgress.done();
  }
</script>

<style>
  /* Make clicks pass-through */
  :global(#nprogress) {
    pointer-events: none;
  }

  :global(#nprogress .bar) {
    background: var(--color-green);

    position: fixed;
    z-index: 1031;
    top: 0;
    left: 0;

    width: 100%;
    height: 4px;
  }

  /* Fancy blur effect */
  :global(#nprogress .peg) {
    display: block;
    position: absolute;
    right: 0px;
    width: 100px;
    height: 100%;
    box-shadow: 0 0 10px var(--color-green), 0 0 5px var(--color-green);
    opacity: 1;

    -webkit-transform: rotate(3deg) translate(0px, -4px);
    -ms-transform: rotate(3deg) translate(0px, -4px);
    transform: rotate(3deg) translate(0px, -4px);
  }

  /* Remove these to get rid of the spinner */
  :global(#nprogress .spinner) {
    display: block;
    position: fixed;
    z-index: 1031;
    top: 15px;
    right: 15px;
  }

  :global(#nprogress .spinner-icon) {
    width: 18px;
    height: 18px;
    box-sizing: border-box;

    border: solid 2px transparent;
    border-top-color: var(--color-green);
    border-left-color: var(--color-green);
    border-radius: 50%;

    animation: nprogress-spinner 400ms linear infinite;
  }

  :global(.nprogress-custom-parent) {
    overflow: hidden;
    position: relative;
  }

  :global(.nprogress-custom-parent #nprogress .spinner, .nprogress-custom-parent #nprogress .bar) {
    position: absolute;
  }

  @-webkit-keyframes -global-nprogress-spinner {
    0% {
      -webkit-transform: rotate(0deg);
    }
    100% {
      -webkit-transform: rotate(360deg);
    }
  }
  @keyframes -global-nprogress-spinner {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
</style>
