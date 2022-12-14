<script lang="ts">
  import { LabeledCheckbox, Text, LabeledRadiobox, ToggleAble } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import {
    bookmarkIcon,
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
  export let showHiking = false;
  export let showCycling = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let showRails: boolean;
  export let showStations: boolean;
  export let showTransport: boolean;
  export let showFileTrailModal: boolean;
  export let showTrainConnectionsModal: boolean;
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
</script>

<div class="layers-and-tools">
  {#if superfan}
    <!-- content here -->
    <!-- <div class="uppercase">
      <Text>Layers & Tools</Text>
    </div> -->

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
        <span class="attribution">
          {@html $_('map.trails.attribution', {
            values: {
              link: `<a href="https://waymarkedtrails.org/" target="_blank"  rel="noreferrer" >Waymarked Trails</a>`
            }
          })}
        </span>

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
          <Button inverse xxsmall on:click={toggleFileTrailModal}>
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
            <Button inverse xxsmall on:click={toggleTrainConnectionsModal}>
              Find train connections
            </Button>
            <span class="attribution">Uses the Direkt Bahn Guru project </span>
          </div>
        </div>
      </div>
    </ToggleAble>
  {:else}
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
    background-color: rgba(255, 255, 255, 0.9);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 26rem;
    /* height: var(--layers-and-tools-height); */
    padding: 1rem;
  }

  .attribution {
    font-size: 1.2rem;
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
</style>
