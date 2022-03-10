<script>
  import { _ } from 'svelte-i18n';
  import { Banner } from '../UI';
</script>

<Banner cookieName="slowby-banner-dismissed"
  >{@html $_('index.slowby.banner.copy', {
    values: {
      title: `<a class="banner-link" href="${$_(`index.slowby.banner.url`)}" target="_blank">${$_(
        `index.slowby.banner.title`
      )}</a>`,
      link: `<a class="banner-link" href="${$_(`index.slowby.banner.url`)}" target="_blank">${$_(
        `index.slowby.banner.url`
      )}</a>`
    }
  })}</Banner
>
