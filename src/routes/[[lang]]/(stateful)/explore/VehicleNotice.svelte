<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Icon } from '$lib/components/UI';
  import { crossIcon } from '$lib/images/icons';

  let { close: closeCarNotice }: { close: () => void } = $props();
</script>

<div class="vehicle-notice-wrapper">
  <button onclick={closeCarNotice} aria-label="Close notice" class="button-container close">
    <Icon icon={crossIcon} />
  </button>

  <div class="vehicle-notice">
    <div class="image-container">
      <img src="/images/no-car.svg" alt="No vehicle allowed" />
    </div>
    <h3>{@html $_('map.vehicle-notice.title')}</h3>
    <p class="mt-m">{@html $_('map.vehicle-notice.text')}</p>
  </div>
</div>

<style>
  .vehicle-notice-wrapper {
    width: 45rem;
    height: 30rem;
    box-shadow: 0px 0px 21.5877px rgba(0, 0, 0, 0.1);
    position: fixed;
    bottom: var(--height-footer);
    left: 0;
    background-color: var(--color-white);
    border-radius: 0.6rem;
    z-index: 20;
  }

  .vehicle-notice {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
    font-family: var(--fonts-copy);
    width: 100%;
    height: 100%;
  }

  .vehicle-notice h3 {
    font-size: 1.8rem;
    line-height: 1.4;
    text-transform: uppercase;
    position: relative;
    font-weight: 700;
  }

  .vehicle-notice h3::after {
    content: '';
    width: 16rem;
    position: absolute;
    bottom: -1rem;
    left: calc(50% - 8rem);
    height: 0.4rem;
    background: var(--color-orange-light);
    border-radius: 0.5rem;
  }

  .vehicle-notice p {
    font-size: 1.4rem;
  }

  .vehicle-notice .image-container {
    width: 10rem;
    height: 10rem;
  }

  .vehicle-notice .image-container img {
    max-width: 100%;
  }

  .close {
    width: 3.6rem;
    height: 3.6rem;
    position: absolute;
    right: 1.2rem;
    top: 1.2rem;
    cursor: pointer;
    z-index: 10;
  }

  @media screen and (max-width: 700px) {
    .vehicle-notice-wrapper {
      top: 2rem;
      left: calc(50% - 22.5rem);
    }

    :global(.app.native.ios .vehicle-notice-wrapper) {
      /* 1.2rem makes it have similar position to the normal mobile notice relative to the filter buttons */
      top: calc(1.2rem + env(safe-area-inset-top, 0px));
    }
  }

  @media screen and (max-width: 500px) {
    .vehicle-notice-wrapper {
      width: 90%;
      left: 5%;
      height: 24rem;
    }

    .vehicle-notice {
      padding: 3rem 2rem 1rem;
    }

    .image-container {
      display: none;
    }
  }

  @media screen and (max-width: 400px) {
    .vehicle-notice-wrapper {
      height: 28rem;
    }
  }
</style>
