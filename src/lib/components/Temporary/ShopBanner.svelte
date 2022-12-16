<script>
  import { _ } from 'svelte-i18n';
  import { Banner } from '../UI';
  import { SHOP_URL } from '$lib/constants';
</script>

<Banner cookieName="shop-banner-dismissed"
  >{@html $_('index.shop.banner.copy', {
    values: {
      title: `<a class="banner-link" href="${SHOP_URL}" target="_blank">${$_(
        `index.shop.banner.title`
      )}</a>`,
      link: `<a class="banner-link" href="${SHOP_URL}" target="_blank">${SHOP_URL}</a>`
    }
  })}</Banner
>
