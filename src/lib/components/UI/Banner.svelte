<script lang="ts">
  import { Icon } from '../UI';
  import { crossIcon } from '$lib/images/icons';
  import { getCookie } from '$lib/util';
  import { setExpiringCookie } from '$lib/util/set-cookie';

  interface Props {
    cookieName: string;
    children?: import('svelte').Snippet;
  }

  let { cookieName, children }: Props = $props();

  let bannerShown = $state(!getCookie(cookieName));

  const closeBanner = () => {
    setExpiringCookie(cookieName, true, 365 * 24);
    bannerShown = false;
  };
</script>

{#if bannerShown}
  <header class="banner">
    <div class="banner-content">
      <p>
        {@render children?.()}
      </p>
      <button
        onclick={closeBanner}
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
