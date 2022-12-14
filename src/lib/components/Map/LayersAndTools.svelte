<script lang="ts">
  import { LabeledCheckbox, Text, LabeledRadiobox, ToggleAble } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import {
    bookmarkIcon,
    crossIcon,
    cyclistIcon,
    flagIcon,
    hikerIcon,
    routesIcon,
    tentIcon,
    tentNoIcon,
    trainIcon
  } from '@/lib/images/icons';
  import { user } from '@/lib/stores/auth';
  import Button from '../UI/Button.svelte';
  import {
    removeTrainconnectionsDataLayers,
    toggleVisibilityTrainconnectionsDataLayers,
    trainconnectionsDataLayers
  } from '@/lib/stores/trainconnections';
  import {
    fileDataLayers,
    removeFileDataLayers,
    toggleVisibilityFileDataLayers
  } from '@/lib/stores/file';
  import MultiActionLabel from '@/lib/components/UI/MultiActionLabel.svelte';
  import { cleanName } from '@/lib/util/slugify';
  import Icon from '@/lib/components/UI/Icon.svelte';
  import Badge from '@/lib/components/UI/Badge.svelte';
  import { goto } from '@/lib/util/navigate';
  import routes from '@/lib/routes';
  import { fade, fly } from 'svelte/transition';

  export let showHiking = false;
  export let showCycling = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let showRails: boolean;
  export let showStations: boolean;
  export let showTransport: boolean;
  export let showFileTrailModal: boolean;
  export let showTrainConnectionsModal: boolean;
  let showSuperfanInfo = true;

  let gardensGroup: 'ALL' | 'SAVED' | 'HIDE' = 'ALL';

  $: superfan = $user?.superfan;

  $: {
    switch (gardensGroup) {
      case 'ALL':
        showGardens = true;
        showSavedGardens = false;
        break;
      case 'SAVED':
        showGardens = false;
        showSavedGardens = true;
        break;
      case 'HIDE':
        showGardens = false;
        showSavedGardens = false;
        break;
      default:
        break;
    }
  }

  let localTrainconnectionsDataLayers = $trainconnectionsDataLayers;
  trainconnectionsDataLayers.subscribe((value) => {
    localTrainconnectionsDataLayers = value;
  });

  let localFileDataLayers = $fileDataLayers;
  fileDataLayers.subscribe((value) => {
    localFileDataLayers = value;
  });

  const toggleTrainConnectionsModal = (e: Event) => {
    showTrainConnectionsModal = !showTrainConnectionsModal;
  };

  const toggleFileTrailModal = (e: Event) => {
    showFileTrailModal = !showFileTrailModal;
  };

  const gotoSuperfan = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    goto(routes.SIGN_IN);
  };
</script>

<div class="layers-and-tools">
  {#if superfan}
    <div class="layers-and-tools-superfan">
      <ToggleAble>
        <span slot="title">Gardens</span>
        <div slot="content">
          <LabeledRadiobox
            id="all-gardens"
            name="gardens"
            bind:group={gardensGroup}
            label={'Show all gardens'}
            value="ALL"
          />
          <LabeledRadiobox
            id="saved-gardens"
            name="gardens"
            bind:group={gardensGroup}
            label={'Only saved gardens'}
            value="SAVED"
          />
          <LabeledRadiobox
            id="hide-gardens"
            name="gardens"
            bind:group={gardensGroup}
            label={'Hide all gardens'}
            value="HIDE"
          />
        </div>
      </ToggleAble>

      <ToggleAble>
        <span slot="title">Hiking & cycling routes</span>
        <div slot="content">
          <LabeledCheckbox
            name="hiking"
            icon={hikerIcon}
            label={$_('map.trails.hiking')}
            bind:checked={showHiking}
          />
          <LabeledCheckbox
            name="cycling"
            icon={cyclistIcon}
            label={$_('map.trails.cycling')}
            bind:checked={showCycling}
          />

          <div class="data-layers">
            {#each localFileDataLayers as layer, i}
              <MultiActionLabel
                icon={routesIcon}
                name={layer.id}
                label={cleanName(layer.name)}
                checked={layer.visible}
                on:change={() => {
                  toggleVisibilityFileDataLayers(layer.id);
                }}
                on:secondary={() => {
                  removeFileDataLayers(layer.id);
                }}
              />
            {/each}
          </div>

          <div class="layers-and-tools-button">
            <Button preventing inverse xxsmall on:click={toggleFileTrailModal}>
              <span class="button-text-container">
                <span class="button-icon">
                  <Icon icon={routesIcon} />
                </span>
                <span class="button-text">Upload a route</span>
              </span>
            </Button>
          </div>
        </div>
      </ToggleAble>

      <ToggleAble>
        <span slot="title">Railway network</span>
        <div slot="content">
          <LabeledCheckbox
            name="transport"
            icon={trainIcon}
            label={'Show train network'}
            bind:checked={showTransport}
          />

          <div class="hide">
            <LabeledCheckbox
              name="rails"
              icon={flagIcon}
              label={'Railway track'}
              bind:checked={showRails}
            />
            <LabeledCheckbox
              name="trainStations"
              icon={flagIcon}
              label={'Train stations'}
              bind:checked={showStations}
            />
            <div class="data-layers">
              {#each localTrainconnectionsDataLayers as layer, i}
                <MultiActionLabel
                  icon={flagIcon}
                  name={layer.id}
                  label={layer.originStation.name}
                  checked={layer.visible}
                  on:change={() => {
                    toggleVisibilityTrainconnectionsDataLayers(layer.id);
                  }}
                  on:secondary={() => {
                    removeTrainconnectionsDataLayers(layer.id);
                  }}
                />
              {/each}
            </div>
            <div class="layers-and-tools-button">
              <Button preventing inverse xxsmall on:click={toggleTrainConnectionsModal}>
                Find train connections
              </Button>
              <span class="attribution">Uses the Direkt Bahn Guru project </span>
            </div>
          </div>
        </div>
      </ToggleAble>
    </div>
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
              link: `<a href="https://waymarkedtrails.org/" target="_blank"  rel="noreferrer" >Waymarked Trails</a>`
            }
          })}
        </span>
      </div>
      {#if showSuperfanInfo}
        <div
          class="layers-and-tools-visitors-superfan"
          in:fly={{ x: -260, duration: 2000 }}
          out:fly|local={{ x: -260, duration: 2000 }}
        >
          <button
            class="button-container layers-and-tools-visitors-close"
            on:click|preventDefault|stopPropagation={() => (showSuperfanInfo = !showSuperfanInfo)}
          >
            <Icon icon={crossIcon} />
          </button>
          <div class="title">
            <div class="badge"><Text size="s" weight="bold">NEW</Text></div>
            <div class="text">
              <Text size="m" weight="bold">Plan Better</Text>
            </div>
            <span />
          </div>
          <div>
            <Text size="m" weight="thin">
              Upload your own routes, save gardens, see train connections & more by
              <a on:click={gotoSuperfan}>becoming a superfan</a>.
            </Text>
          </div>
        </div>
      {:else}
        <button
          class="button-container layers-and-tools-visitors-icons"
          on:click|preventDefault|stopPropagation={() => (showSuperfanInfo = !showSuperfanInfo)}
        >
          <Icon icon={trainIcon} />
          <Icon icon={bookmarkIcon} />
          <Icon icon={routesIcon} />
        </button>
      {/if}
    </div>
  {/if}
</div>

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

  .attribution {
    font-size: 1.2rem;
    margin-top: 1rem;
    display: inline-block;
  }

  .attribution :global(a) {
    text-decoration: underline;
  }

  .layers-and-tools-button {
    margin-top: 0.5rem;
    text-align: center;
  }

  .button-text-container {
    display: inline-flex;
    align-items: center;
  }

  .button-icon {
    width: 1.4rem;
    height: 1.4rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }

  .layers-and-tools-visitors-container {
    background-color: transparent;
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 9rem;
    position: relative;
  }

  .layers-and-tools-visitors {
    background-color: rgba(255, 255, 255, 0.9);
    width: 26rem;
    padding: 1rem;
    z-index: 10;
  }

  .layers-and-tools-visitors-superfan {
    background-color: var(--color-superfan-yellow);
    width: 26rem;
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

  .layers-and-tools-visitors-superfan .badge {
    color: var(--color-white);
    background-color: var(--color-green);

    display: inline-flex;
    align-items: center;
    border-radius: 1rem;
    box-sizing: border-box;
    padding: 0.4rem 0.6rem;
    font-size: 1.4rem;
  }

  .layers-and-tools-visitors-superfan .title .text {
    padding-left: 1rem;
  }

  .layers-and-tools-visitors-superfan a {
    text-decoration: underline;
    cursor: pointer;
  }

  .layers-and-tools-visitors-icons {
    background-color: var(--color-superfan-yellow);

    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.8rem;
    width: initial !important;
  }

  .layers-and-tools-visitors-icons :global(i) {
    flex-grow: 1;
    width: 1.4rem;
    height: 1.4rem;
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
</style>
