<script>
  import Video from '../_components/Video.svelte';
</script>

<div class="wrapper">
  <div class="text">
    <slot />
  </div>
  <div class="video"><Video /></div>
</div>

<style>
  div.wrapper {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 3rem;
  }

  div.text {
    flex: 1;
    max-width: 46%;
  }

  div.video {
    flex: 1;
    height: 60%;
  }
</style>
