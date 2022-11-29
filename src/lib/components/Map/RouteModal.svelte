<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, FileInput, Modal } from '$lib/components/UI';
  import fileToGeoJson from '@/lib/util/map/fileToGeoJson';
  import { keyboardEvent } from '@/lib/stores/keyboardEvent';

  export let file: GeoJSON.GeoJSON;
  let files: FileList;
  // application/vnd.geo+json is obsolete, but still used by some apps
  const validFileTypes = ['application/geo+json', 'application/vnd.geo+json'];

  // MODAL
  let ariaLabelledBy = 'route-modal-title';
  export let show = false;
  let stickToBottom = false;
  let maxWidth = 700;
  let vw: number;
  $: {
    if (vw < maxWidth) stickToBottom = true;
    else stickToBottom = false;
  }

  // TEMPORARY
  $: if (files) {
    if (validFileTypes.includes(files[0].type)) {
      fileToGeoJson(files[0]).then((geoJson) => {
        file = geoJson;
        show = false;
      });
    }
  }

  keyboardEvent.subscribe((e) => {
    if (e?.key === 'n') if (!show) show = true;
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
    <h2 id="Title">Upload trail</h2>
  </div>
  <div slot="body" class="BodySection">
    <hr />
    <FileInput bind:files />
    <hr />
  </div>
  <div slot="controls">
    <Button
      uppercase
      small
      on:click={() => {
        show = false;
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
