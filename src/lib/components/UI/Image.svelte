<script lang="ts">
  interface Props {
    src?: string;
    alt?: string;
    style?: string;
    rounded?: boolean;
  }

  let {
    src = '',
    alt = '',
    style = '',
    rounded = true
  }: Props = $props();
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
