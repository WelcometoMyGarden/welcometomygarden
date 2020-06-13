<script>
  export let src = '';
  export let alt = '';
  export let style = '';
</script>

<img {src} {alt} {style} />

<style type="text/scss">
  @import '../../style/variables';

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: $radius-m;
  }
</style>
