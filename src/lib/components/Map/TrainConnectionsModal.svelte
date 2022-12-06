<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, Modal, TextInput } from '$lib/components/UI';
  import { keyboardEvent } from '@/lib/stores/keyboardEvent';
  import {
    fetchStation,
    hasLocation,
    isLongDistanceOrRegionalOrSuburban,
    isRegion,
    toPoint
  } from '@/lib/util/map/trainConnections';

  export let show = false;
  let input: string = '';

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
    getStations(input).then((stations) => {
      console.log(stations);
    });
  }

  const getStations = async (input: string) => {
    const results = await fetchStation(input);
    const filteredResults = results.filter(
      (x) => isLongDistanceOrRegionalOrSuburban(x) && !isRegion(x) && hasLocation(x)
    );
    return filteredResults.map(toPoint());
  };

  const handleInput = async () => {
    console.log(input);
    reset();
  };

  const reset = () => {
    input = '';
    show = false;
  };

  keyboardEvent.subscribe((e) => {
    if (e?.key === 't') show = !show;
  });
</script>

<svelte:window bind:innerWidth={vw} />

<Modal
  bind:show
  maxWidth="{maxWidth}px"
  radius
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
    <TextInput bind:value={input} name="trains" />
    <hr />
  </div>
  <div slot="controls">
    <Button
      uppercase
      small
      on:click={() => {
        handleInput();
      }}>{'Do things'}</Button
    >
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
