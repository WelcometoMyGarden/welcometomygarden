<script>
  import { _ } from 'svelte-i18n';
  import { Banner } from '../UI';

  let bannerText = $_('index.banner-stmf.copy', {
    values: {
      stmfLink: `<a class="banner-link" href="#mini-festival">${$_(`index.banner-stmf.link`)}</a>`
    }
  });
</script>

<Banner cookieName="festival-banner-dismissed" {bannerText} />
