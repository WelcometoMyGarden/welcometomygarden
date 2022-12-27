<script lang="ts">
  import { LabeledCheckbox, Text, ToggleAble } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import {
    bookmarkIcon,
    crossIcon,
    cyclistIcon,
    hikerIcon,
    routesIcon,
    tentIcon,
    trainIcon
  } from '@/lib/images/icons';
  import { user } from '@/lib/stores/auth';
  import Button from '../UI/Button.svelte';
  import Icon from '@/lib/components/UI/Icon.svelte';
  import routes from '@/lib/routes';
  import { fly } from 'svelte/transition';
  import IconButton from '@/lib/components/UI/IconButton.svelte';
  import { getCookie, setCookie } from '@/lib/util';
  import GardensTools from '@/lib/components/LayersAndTools/GardensTools.svelte';
  import GardensModal from '@/lib/components/LayersAndTools/GardensModal.svelte';
  import TrailsModal from '@/lib/components/LayersAndTools/TrailsModal.svelte';
  import TransportModal from '@/lib/components/LayersAndTools/TransportModal.svelte';
  import TrailsTool from '@/lib/components/LayersAndTools/TrailsTool.svelte';
  import TransportTools from '@/lib/components/LayersAndTools/TransportTools.svelte';
  import capitalize from '@/lib/util/capitalize';

  export let showHiking = false;
  export let showCycling = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let showRails: boolean;
  export let showStations: boolean;
  export let showTransport: boolean;
  export let showFileTrailModal: boolean;
  export let showTrainConnectionsModal: boolean;
  let showGardensModal = false;
  let showTrailsModal = false;
  let showTransportModal = false;

  let showSuperfanInfo = true;

  let innerWidth: number;
  let isMobile = false;
  $: isMobile = innerWidth <= 700;

  $: {
    if (isMobile) showSuperfanInfo = !getCookie('superfan-dismissed');
    else showSuperfanInfo = true;
  }

  $: superfan = $user?.superfan;

  const toggleTrainConnectionsModal = (e: Event) => {
    showTrainConnectionsModal = !showTrainConnectionsModal;
  };

  const toggleFileTrailModal = (e: Event) => {
    showFileTrailModal = !showFileTrailModal;
  };

  const toggleSuperfanInfo = (e: Event) => {
    if (showSuperfanInfo) closeSuperfanInfo();
    else showSuperfanInfo = !showSuperfanInfo;
  };

  const closeSuperfanInfo = (_?: any) => {
    const date = new Date();
    const days = 30;
    date.setTime(date.getTime() + days * 86400000); //24 * 60 * 60 * 1000
    setCookie('superfan-dismissed', true, { expires: date.toGMTString() });
    showSuperfanInfo = false;
  };
</script>

<svelte:window bind:innerWidth />
<div class="layers-and-tools">
  {#if superfan}
    <div class="layers-and-tools-superfan">
      <ToggleAble>
        <span slot="title">{$_('map.gardens.title')}</span>
        <div slot="content">
          <GardensTools bind:showGardens bind:showSavedGardens />
        </div>
      </ToggleAble>

      <ToggleAble>
        <span slot="title">{$_('map.routes.title')}</span>
        <div slot="content">
          <TrailsTool bind:showCycling bind:showHiking on:click={toggleFileTrailModal} />
        </div>
      </ToggleAble>

      <ToggleAble>
        <span slot="title">{$_('map.railway.title')}</span>
        <div slot="content">
          <TransportTools
            bind:showRails
            bind:showStations
            bind:showTransport
            on:click={toggleTrainConnectionsModal}
          />
        </div>
      </ToggleAble>
    </div>
    <div class="layers-and-tools-superfan-mobile">
      <div class="fab">
        <IconButton xsmall on:click={() => (showGardensModal = !showGardensModal)}>
          <div class="fab-icon">
            <Icon icon={tentIcon} whiteStroke />
          </div>
        </IconButton>
      </div>
      <div class="fab">
        <IconButton xsmall on:click={() => (showTrailsModal = !showTrailsModal)}>
          <div class="fab-icon">
            <Icon icon={routesIcon} whiteStroke />
          </div>
        </IconButton>
      </div>
      <div class="fab">
        <IconButton xsmall on:click={() => (showTransportModal = !showTransportModal)}>
          <div class="fab-icon">
            <Icon icon={trainIcon} whiteStroke />
          </div>
        </IconButton>
      </div>
    </div>

    {#if isMobile}
      <GardensModal bind:show={showGardensModal} bind:showGardens bind:showSavedGardens />
      <TrailsModal
        bind:show={showTrailsModal}
        bind:showCycling
        bind:showHiking
        on:click={toggleFileTrailModal}
      />
      <TransportModal
        bind:show={showTransportModal}
        bind:showRails
        bind:showStations
        bind:showTransport
        on:click={toggleTrainConnectionsModal}
      />
    {/if}
  {:else}
    <div class="layers-and-tools-visitors-container">
      <div class="layers-and-tools-visitors">
        <div>
          <LabeledCheckbox
            name="hiking"
            icon={hikerIcon}
            label={$_('map.trails.hiking')}
            bind:checked={showHiking}
          />
        </div>
        <div>
          <LabeledCheckbox
            name="cycling"
            icon={cyclistIcon}
            label={$_('map.trails.cycling')}
            bind:checked={showCycling}
          />
        </div>
        <span class="attribution">
          {@html $_('map.trails.attribution', {
            values: {
              link: `<a href="https://waymarkedtrails.org/" target="_blank" rel="noreferrer">Waymarked Trails</a>`
            }
          })}
        </span>
      </div>
      {#if showSuperfanInfo && !isMobile}
        <!-- out:fly|local={{ x: -260, duration: 2000 }} -->
        <div class="layers-and-tools-visitors-superfan" in:fly={{ x: -260, duration: 2000 }}>
          <button
            class="button-container layers-and-tools-visitors-close"
            on:click|preventDefault|stopPropagation={toggleSuperfanInfo}
          >
            <Icon icon={crossIcon} />
          </button>
          <div class="title">
            <div class="text">
              <Text size="m" weight="bold">{$_('map.superfan-notice.title')}</Text>
            </div>
            <span />
          </div>
          <div>
            <Text size="m" weight="thin">
              {@html $_('map.superfan-notice.description', {
                values: {
                  linkText: `<a class="underline" href="${routes.BECOME_SUPERFAN}">${$_(
                    'map.superfan-notice.linkText'
                  )}`
                }
              })}
            </Text>
          </div>
        </div>
      {:else}
        <button
          class="button-container layers-and-tools-visitors-icons"
          on:click|preventDefault|stopPropagation={toggleSuperfanInfo}
        >
          <Icon icon={trainIcon} />
          <Icon icon={bookmarkIcon} />
          <Icon icon={routesIcon} />
        </button>
      {/if}
    </div>
  {/if}
</div>

{#if showSuperfanInfo && isMobile}
  <div class="superfan-notice-wrapper">
    <button on:click={closeSuperfanInfo} aria-label="Close notice" class="button-container close">
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
        <Button href={routes.BECOME_SUPERFAN} medium uppercase
          >{capitalize($_('map.superfan-notice.linkText'))}</Button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  :root {
    --layers-and-tools-height: 21rem;
  }
  /*
    The bottom left mapbox controls should be above the layersAndTools component
    TODO: Can we render this scale control ourselves in a flex-box ruled component?
    Then it will scale dynamically.
  */
  :global(.mapboxgl-ctrl-bottom-left) {
    bottom: var(--layers-and-tools-height);
    visibility: hidden;
    /* TODO REMOVE HIDDEN */
  }
  .layers-and-tools {
    background-color: transparent;
    bottom: 0;
    left: 0;
    position: absolute;
    /* height: var(--layers-and-tools-height); */
  }

  .layers-and-tools-superfan {
    background-color: rgba(255, 255, 255, 0.9);
    width: 26rem;
    padding: 1rem;
  }

  .layers-and-tools-superfan-mobile {
    display: none;
    flex-direction: column;
    position: absolute;
    bottom: 0;
    left: 0;
    padding: 1rem;
  }

  .layers-and-tools-superfan-mobile .fab {
    margin: 0.5rem 0;
    width: 4rem;
  }

  .layers-and-tools-superfan-mobile .fab-icon {
    width: 3rem;
    height: 3rem;
  }

  .attribution {
    font-size: 1.2rem;
    margin-top: 1rem;
    line-height: 120%;
    display: inline-block;
    max-width: 26rem;
  }

  .attribution :global(a) {
    text-decoration: underline;
  }

  .layers-and-tools-visitors-container {
    background-color: transparent;
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto;
    align-items: stretch;
    width: 100%;
    position: relative;
  }

  .layers-and-tools-visitors > div {
    white-space: nowrap;
  }

  .layers-and-tools-visitors {
    background-color: rgba(255, 255, 255, 0.9);
    /* width: 26rem; */
    padding: 1rem;
    z-index: 10;
  }

  .layers-and-tools-visitors-superfan {
    background-color: var(--color-superfan-yellow);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    z-index: 9;
    position: relative;
  }

  .layers-and-tools-visitors-superfan .title {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: flex-start;
  }

  .layers-and-tools-visitors-superfan :global(.text) {
    max-width: 27rem;
  }

  .layers-and-tools :global(a.underline) {
    text-decoration: underline;
    cursor: pointer;
  }

  .layers-and-tools-visitors-icons {
    background-color: var(--color-superfan-yellow);

    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    padding: 0.8rem;
  }

  .layers-and-tools-visitors-icons :global(i) {
    flex-grow: 1;
    width: 1.4rem;
    height: 1.4rem;
    margin: 0.4rem 0;
  }

  .layers-and-tools-visitors-close {
    position: absolute;
    top: 0;
    right: 0;
    padding: 0.5rem;
    cursor: pointer;
    width: 3rem;
    height: 3rem;
  }

  @media screen and (max-width: 700px) {
    .layers-and-tools-superfan {
      display: none;
    }

    .layers-and-tools-superfan-mobile {
      display: flex;
    }
  }

  /* notice */

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
    font-weight: 900;
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
