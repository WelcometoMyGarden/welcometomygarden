<script lang="ts">
	import { toggleVisibilityFileDataLayers } from './../../stores/file.ts';
  import { LabeledCheckbox, Text } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import { bookmarkIcon, cyclistIcon, flagIcon, hikerIcon, tentIcon } from '@/lib/images/icons';
  import { user } from '@/lib/stores/auth';
  import Button from '../UI/Button.svelte';
  import {
    toggleVisibilityTrainconnectionsDataLayers,
    trainconnectionsDataLayers
  } from '@/lib/stores/trainconnections';
  import { fileDataLayers } from '@/lib/stores/file';
  export let showHiking = false;
  export let showCycling = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;
  export let showRails: boolean;
  export let showStations: boolean;
  export let showRouteModal: boolean;
  export let showTrainConnectionsModal: boolean;

  $: superfan = $user?.superfan;

  let localTrainconnectionsDataLayers = $trainconnectionsDataLayers;
  trainconnectionsDataLayers.subscribe((value) => {
    localTrainconnectionsDataLayers = value;
  });

  let localFileDataLayers = $fileDataLayers;
  fileDataLayers.subscribe((value) => {
    localFileDataLayers = value;
  });
</script>

<div class="layers-and-tools">
  {#if superfan}
    <!-- content here -->
    <div class="uppercase">
      <Text>Layers & Tools</Text>
    </div>

    <div class="toggle-title uppercase">
      <Text>Gardens</Text>
    </div>
    <div>
      <div>
        <LabeledCheckbox
          name="gardens"
          icon={tentIcon}
          label={'Gardens'}
          bind:checked={showGardens}
        />
      </div>
      <div>
        <LabeledCheckbox
          name="savedGardens"
          icon={bookmarkIcon}
          label={'Saved gardens'}
          bind:checked={showSavedGardens}
        />
      </div>
    </div>

    <div class="toggle-title uppercase">
      <Text>Trails</Text>
    </div>
    <div class="waymarked-checks">
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

    <div>
      {#each localFileDataLayers as layer, i}
        <div>
          <LabeledCheckbox
            icon={flagIcon}
            name={layer.id}
            label={layer.name}
            checked={layer.visible}
            on:change={() => {
              toggleVisibilityFileDataLayers(layer.id);
            }}
          />
        </div>
      {/each}
    </div>

    <div class="layers-and-tools-button">
      <Button inverse xxsmall on:click={() => (showRouteModal = !showRouteModal)}>
        Upload a route
      </Button>
    </div>

    <div class="toggle-title uppercase">
      <Text>Railway network</Text>
    </div>
    <div>
      <div>
        <LabeledCheckbox
          name="rails"
          icon={flagIcon}
          label={'Railway track'}
          bind:checked={showRails}
        />
      </div>
      <div>
        <LabeledCheckbox
          name="trainStations"
          icon={flagIcon}
          label={'Train stations'}
          bind:checked={showStations}
        />
      </div>
    </div>

    <div>
      {#each localTrainconnectionsDataLayers as layer, i}
        <div>
          <LabeledCheckbox
            icon={flagIcon}
            name={layer.id}
            label={layer.originStation.name}
            checked={layer.visible}
            on:change={() => {
              toggleVisibilityTrainconnectionsDataLayers(layer.id);
            }}
          />
        </div>
      {/each}
    </div>

    <div class="layers-and-tools-button">
      <Button
        inverse
        xxsmall
        on:click={() => (showTrainConnectionsModal = !showTrainConnectionsModal)}
      >
        Find train connections
      </Button>
      <span class="attribution">Uses the Direkt Bahn Guru project </span>
    </div>
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
  .uppercase {
    text-transform: uppercase;
  }

  .toggle-title {
    display: flex;
    align-items: center;
    margin-top: 1rem;
  }
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
    background-color: rgba(255, 255, 255, 0.8);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 26rem;
    /* height: var(--layers-and-tools-height); */
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
  }
</style>
