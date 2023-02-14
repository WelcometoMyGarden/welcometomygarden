<script lang="ts">
  import { crossIcon } from '$lib/images/icons';
  import { Icon } from '../../UI';
  import { Text } from '$lib/components/UI';
  import routes from '$lib/routes';
  import { clickOutside } from '$lib/directives';
  import { _ } from 'svelte-i18n';
  import Button from '../../UI/Button.svelte';
  import capitalize from '$lib/util/capitalize';
  export let onToggle: (e: Event) => void;
</script>

<div
  class="superfan-notice-wrapper"
  use:clickOutside
  on:click-outside={({ detail: { clickEvent } }) => {
    const externalButtonEl = document.querySelector(
      '.button-container.layers-and-tools-visitors-icons'
    );
    if (externalButtonEl) {
      if (clickEvent.target !== externalButtonEl && !externalButtonEl.contains(clickEvent.target)) {
        onToggle();
      }
      // if we clicked the button, that button will handle the toggle instead.
    }
  }}
>
  <button on:click={onToggle} aria-label="Close notice" class="button-container close">
    <Icon icon={crossIcon} />
  </button>
  <div class="superfan-notice">
    <div class="title">
      <h3>{$_('map.superfan-notice.title')}</h3>
    </div>
    <div class="text">
      <Text size="m" weight="thin">
        {@html $_('map.superfan-notice.description', {
          values: {
            linkText: $_('map.superfan-notice.linkText')
          }
        })}
      </Text>
    </div>

    <div>
      <Button href={routes.BECOME_SUPERFAN} medium uppercase orange
        >{capitalize($_('map.superfan-notice.linkText'))}</Button
      >
    </div>
  </div>
</div>

<style>
  .superfan-notice-wrapper {
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

  .superfan-notice {
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

  .superfan-notice .title {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .superfan-notice h3 {
    margin-left: 1rem;
    font-size: 1.8rem;
    line-height: 1.4;
    text-transform: uppercase;
    position: relative;
    font-weight: 700;
  }

  /* Underline bar */
  .superfan-notice .title::after {
    content: '';
    width: 20rem;
    position: absolute;
    bottom: -1rem;
    left: calc(50% - 10rem);
    height: 0.4rem;
    background: var(--color-orange-light);
    border-radius: 0.5rem;
  }

  .superfan-notice .title {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .superfan-notice .text {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 90%;
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
    .superfan-notice-wrapper {
      top: 2rem;
      left: calc(50% - 22.5rem);
    }
  }

  @media screen and (max-width: 500px) {
    .superfan-notice-wrapper {
      width: 90%;
      left: 5%;
      height: 24rem;
    }

    .superfan-notice {
      padding: 3rem 2rem 1rem;
    }
  }

  @media screen and (max-width: 400px) {
    .superfan-notice-wrapper {
      height: 28rem;
    }
  }
</style>
