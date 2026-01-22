<script lang="ts">
  import NProgress from 'nprogress';
  interface Props {
    active?: boolean;
    speed?: number;
  }

  let { active = false, speed = 0 }: Props = $props();

  $effect(() => {
    if (speed) NProgress.configure({ trickleSpeed: speed });

    if (active) NProgress.start();
    else NProgress.done();
  });
</script>
