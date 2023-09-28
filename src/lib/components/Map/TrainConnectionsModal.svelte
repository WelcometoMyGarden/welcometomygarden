<script lang="ts">
  import { Text } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import { Button, Modal, TextInput } from '$lib/components/UI';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import {
    fetchStation,
    hasLocation,
    isLongDistanceOrRegionalOrSuburban,
    isRegion,
    toPoint
  } from '$lib/util/map/trainConnections';
  import { flagIcon } from '$lib/images/icons';
  import { addTrainconnectionsDataLayers } from '$lib/stores/trainconnections';
  import { slugify } from '$lib/util';
  import type { OriginStation } from '$lib/types/DataLayer';
  import { onDestroy } from 'svelte';

  export let show = false;
  let input = '';
  let error = '';
  let foundStations: any[] = [];
  let selectedStation: OriginStation | null = null;

  // MODAL
  let ariaLabelledBy = 'train-modal-title';
  let stickToBottom = false;
  let maxWidth = 700;
  let vw: number;

  $: {
    if (vw < maxWidth) stickToBottom = true;
    else stickToBottom = false;
  }

  $: if (input.length > 0) {
    getStations(input).then((stations) => (foundStations = stations));
  }

  const getStations = async (input: string) => {
    const results = await fetchStation(input);
    const filteredResults = results.filter(
      (x: any) => isLongDistanceOrRegionalOrSuburban(x) && !isRegion(x) && hasLocation(x)
    );
    return filteredResults.map(toPoint());
  };

  const validateStation = (v: string) => {
    const filteredStation = foundStations.find((station) => slugify(station.name) == slugify(v));

    if (!filteredStation) {
      error = 'Please enter a valid station name';
      return error;
    } else {
      selectedStation = filteredStation;
      error = '';
    }
  };

  const handleInput = async () => {
    if (!selectedStation) return;
    addTrainconnectionsDataLayers(selectedStation);
    reset();
  };

  const reset = () => {
    input = '';
    error = '';
    foundStations = [];
    selectedStation = null;
    show = false;
  };

  const unsubscribeFromKeyboardEvent = keyboardEvent.subscribe((e) => {
    if (e?.key === 't') show = !show;
  });

  onDestroy(unsubscribeFromKeyboardEvent);
</script>

<svelte:window bind:innerWidth={vw} />

<Modal
  bind:show
  maxWidth="{maxWidth}px"
  center={!stickToBottom}
  {stickToBottom}
  nopadding={stickToBottom}
  ariaLabelledBy="title"
>
  <div slot="title" class="TitleSection" id={ariaLabelledBy}>
    <h2 id="Title">Direct train connections</h2>
  </div>
  <div slot="body" class="BodySection">
    <hr />
    <div>
      <Text size="l">Look up direct connections from a train station to other stations</Text>
    </div>
    <div>
      <label for="trains-list">From Station</label>
      <TextInput
        autocomplete="trains"
        icon={flagIcon}
        list="trains-datalist"
        name="trains-list"
        id="trains-list"
        {error}
        bind:value={input}
        on:blur={() => validateStation(input)}
      />
      <datalist id="trains-datalist">
        {#each foundStations as foundStation}
          <option data-value={foundStation.id}>{foundStation.name}</option>
        {/each}
      </datalist>
    </div>

    <hr />
  </div>
  <div slot="controls">
    <Button uppercase small on:click={() => handleInput()}>Show connections</Button>
  </div>
</Modal>

<style>
  .TitleSection {
    width: 100%;
  }

  #Title {
    font-weight: bold;
    font-size: 2rem;
    text-align: center;
  }

  @media screen and (max-width: 700px) {
    #Title {
      font-size: initial;
    }
  }
</style>
