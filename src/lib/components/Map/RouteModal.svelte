<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, FileInput, Modal } from '$lib/components/UI';
  import fileToGeoJson from '@/lib/util/map/fileToGeoJson';
  import { keyboardEvent } from '@/lib/stores/keyboardEvent';
  import { VALID_FILETYPE_EXTENSIONS } from '@/lib/constants';
  import { getFileExtension, slugify } from '@/lib/util';
  import { addFileDataLayers, fileDataLayers } from '@/lib/stores/file';

  export let show = false;
  let files: FileList | null = null;

  // MODAL
  let ariaLabelledBy = 'route-modal-title';
  let stickToBottom = false;
  let maxWidth = 700;
  let vw: number;
  $: {
    if (vw < maxWidth) stickToBottom = true;
    else stickToBottom = false;
  }

  // TEMPORARY
  $: if (files) {
    console.log(files);
    Array.from(files).forEach(async (file) => {
      const extension = getFileExtension(file.name);
      if (VALID_FILETYPE_EXTENSIONS.includes(extension)) {
        const geoJson = await fileToGeoJson(file);
        addFileDataLayers({
          name: file.name,
          geoJson: geoJson
        });
        files = null;
        show = false;
      }
    });
  }

  keyboardEvent.subscribe((e) => {
    if (e?.key === 'n') show = !show;
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
    <FileInput
      bind:files
      accept={VALID_FILETYPE_EXTENSIONS.map((ft) => '.' + ft).join(', ')}
      multiple
    />
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
