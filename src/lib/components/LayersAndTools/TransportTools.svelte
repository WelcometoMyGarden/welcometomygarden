<script lang="ts">
  import { Button, LabeledCheckbox, MultiActionLabel } from '@/lib/components/UI';
  import { flagIcon, trainIcon } from '@/lib/images/icons';
  import {
    removeTrainconnectionsDataLayers,
    toggleVisibilityTrainconnectionsDataLayers,
    trainconnectionsDataLayers
  } from '@/lib/stores/trainconnections';

  export let showTransport: boolean;
  export let showRails: boolean;
  export let showStations: boolean;

  let localTrainconnectionsDataLayers = $trainconnectionsDataLayers;
  trainconnectionsDataLayers.subscribe((value) => {
    localTrainconnectionsDataLayers = value;
  });
</script>

<LabeledCheckbox
  name="transport"
  icon={trainIcon}
  label={'Show train network'}
  bind:checked={showTransport}
/>

<div class="hide">
  <LabeledCheckbox name="rails" icon={flagIcon} label={'Railway track'} bind:checked={showRails} />
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
    <Button preventing inverse xxsmall on:click>Find train connections</Button>
    <div>
      <span class="attribution">Uses the Direkt Bahn Guru project </span>
    </div>
  </div>
</div>

<style>
  .layers-and-tools-button {
    margin-top: 0.5rem;
    text-align: center;
  }

  .attribution {
    font-size: 1.2rem;
    margin-top: 1rem;
    display: inline-block;
  }

  .attribution :global(a) {
    text-decoration: underline;
  }
</style>
