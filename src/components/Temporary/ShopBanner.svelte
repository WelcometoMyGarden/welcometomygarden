<script>
  import { _, locale } from 'svelte-i18n';
  import { Banner } from '../UI';
  import { SHOP_URL } from '@/constants';

  let bannerText = $_('index.shop.banner.copy', {
    values: {
      title: `<a class="banner-link" href="${SHOP_URL}" target="_blank">${$_(
        `index.shop.banner.title`
      )}</a>`,
      link: `<a class="banner-link" href="${SHOP_URL}" target="_blank">${SHOP_URL}</a>`
    }
  });
</script>

<Banner cookieName="shop-banner-dismissed" {bannerText} />
