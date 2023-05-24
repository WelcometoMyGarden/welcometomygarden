<script lang="ts">
  import { LabeledCheckbox, ToggleAble } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import { cyclistIcon, hikerIcon, routesIcon, tentIcon, trainIcon } from '$lib/images/icons';
  import { user } from '$lib/stores/auth';
  import Icon from '$lib/components/UI/Icon.svelte';
  import IconButton from '$lib/components/UI/IconButton.svelte';
  import { getCookie } from '$lib/util';
  import GardensTools from '$lib/components/LayersAndTools/GardensTools.svelte';
  import GardensModal from '$lib/components/LayersAndTools/GardensModal.svelte';
  import TrailsModal from '$lib/components/LayersAndTools/TrailsModal.svelte';
  import TransportModal from '$lib/components/LayersAndTools/TransportModal.svelte';
  import TrailsTool from '$lib/components/LayersAndTools/TrailsTool.svelte';
  import TransportTools from '$lib/components/LayersAndTools/TransportTools.svelte';
  import SuperfanNoticeModal from './notices/SuperfanNoticeModal.svelte';
  import SuperfanNoticeBox from './notices/SuperfanNoticeBox.svelte';
  import trackEvent from '$lib/util/track-event';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { setExpiringCookie } from '$lib/util/set-cookie';

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

  // Only show the Superfan notice when the car notice was already shown
  let showSuperfanNotice = !!getCookie('car-notice-dismissed') && !getCookie('superfan-dismissed');

  let innerWidth: number;
  $: isMobile = innerWidth <= 700;

  $: superfan = $user?.superfan;

  const toggleTrainConnectionsModal = (e: Event) => {
    showTrainConnectionsModal = !showTrainConnectionsModal;
  };

  const toggleFileTrailModal = (e: Event) => {
    showFileTrailModal = !showFileTrailModal;
    if (showFileTrailModal) {
      trackEvent(PlausibleEvent.START_ROUTE_UPLOAD_FLOW);
    }
  };

  const toggleSuperfanInfo = () => {
    if (showSuperfanNotice) closeSuperfanInfo();
    else showSuperfanNotice = true;
  };

  const closeSuperfanInfo = () => {
    setExpiringCookie('superfan-dismissed', true, 30 * 24);
    showSuperfanNotice = false;
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
            compact
          />
        </div>
        <div>
          <LabeledCheckbox
            name="cycling"
            icon={cyclistIcon}
            label={$_('map.trails.cycling')}
            bind:checked={showCycling}
            compact
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
      <SuperfanNoticeBox {isMobile} isOpen={showSuperfanNotice} onToggle={toggleSuperfanInfo} />
    </div>
  {/if}
</div>

{#if showSuperfanNotice && isMobile}
  <SuperfanNoticeModal onToggle={toggleSuperfanInfo} />
{/if}

<style>
  :root {
    --layers-and-tools-height: 21rem;
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
    margin-top: 0.3rem;
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
    padding: 1rem;
    z-index: 10;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .layers-and-tools :global(a.underline) {
    text-decoration: underline;
    cursor: pointer;
  }

  @media screen and (max-width: 700px) {
    /* Hacky quick fix start: don't allow long French copy to push the superfan notice
       off-screen & cover the map scale.
       TODO: apply a more sustainable solution for all locales
    */
    :global(div.locale-fr) .layers-and-tools-visitors > div {
      white-space: normal;
    }

    :global(div.locale-fr) .layers-and-tools-visitors-container {
      max-width: 82%;
    }
    /* Quick fix end */

    .layers-and-tools-superfan {
      display: none;
    }

    .layers-and-tools-superfan-mobile {
      display: flex;
    }

    .layers-and-tools-visitors {
      padding: 0.5rem 1rem;
      gap: 0;
    }

    .attribution {
      margin-top: 0;
      line-height: 1.6;
    }
  }
</style>
