<script>
  import { _ } from 'svelte-i18n';
  import { Icon } from '../UI';
  import { crossIcon } from '@/images/icons';
  import { getCookie, setCookie } from '@/util';

  let festivalBannerShown = !getCookie('festival-banner-dismissed');
  const closeBanner = () => {
    const date = new Date();
    // one year
    date.setTime(date.getTime() + 365 * 86400000); //24 * 60 * 60 * 1000
    setCookie('festival-banner-dismissed', true, { expires: date.toGMTString() });
    festivalBannerShown = false;
  };
</script>

{#if festivalBannerShown}
  <header class="banner">
    <div class="banner-content">
      <p>
        {@html $_('index.banner-stmf.copy', {
          values: {
            stmfLink: `<a class="banner-link" href="#mini-festival">${$_(
              `index.banner-stmf.link`
            )}</a>`
          }
        })}
      </p>

      <button
        on:click={closeBanner}
        aria-label="Close banner"
        class="button-container close-banner"
      >
        <Icon icon={crossIcon} />
      </button>
    </div>
  </header>
{/if}

<style>
  .banner {
    position: fixed;
    width: 100vw;
    z-index: 100;
    min-height: 9.2rem;
    box-shadow: 0px 15px 10px -15px var(--color-black);
    background-color: var(--color-green);
    text-align: center;
    left: 0;
  }

  .banner-content {
    width: 100%;
    display: flex;
    align-content: center;
    justify-content: center;
    padding: 2rem 8rem;
  }

  .banner p {
    color: var(--color-white);
    font-weight: bold;
    max-width: 80rem;
    margin: 0 auto;
    text-align: center;
  }

  .close-banner {
    width: 3.6rem;
    height: 3.6rem;
    position: absolute;
    right: 2.2rem;
    top: calc(50% - 1.8rem);
    cursor: pointer;
    z-index: 110;
  }

  .close-banner :global(svg) {
    fill: var(--color-white);
  }

  :global(.banner-link) {
    text-decoration: underline;
  }

  :global(.banner-link:hover) {
    text-decoration: underline;
  }

  @media only screen and (max-width: 1000px) {
    .banner-content p {
      font-size: 1.4rem;
    }
  }
</style>
