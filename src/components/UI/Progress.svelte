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
