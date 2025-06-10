<script>
  import { locale } from 'svelte-i18n';
</script>

<iframe
  class="youtube"
  src={`https://www.youtube-nocookie.com/embed/Dnuzpb-Om1M?cc_load_policy=1&cc_lang_pref=${$locale}`}
  title="YouTube video player"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
/>

<style>
  iframe {
    border-radius: 2rem;
    width: 100%;
    aspect-ratio: 16/9;
  }
</style>
