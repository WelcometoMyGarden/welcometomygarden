<script>
  export let src = '';
  export let alt = '';
  export let style = '';
</script>

<img {src} {alt} {style} />

<style>
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: var(--radius-m);
  }
</style>
