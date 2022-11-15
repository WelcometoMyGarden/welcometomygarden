<script>
  export let src = '';
  export let alt = '';
  export let style = '';
  export let rounded = true;
</script>

<img {src} {alt} {style} class:rounded />

<style>
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .rounded {
    border-radius: 1rem;
  }
</style>
