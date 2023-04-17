<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, FileInput, Modal } from '$lib/components/UI';
  import fileToGeoJson from '$lib/util/map/fileToGeoJson';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import { VALID_FILETYPE_EXTENSIONS } from '$lib/constants';
  import { getFileExtension } from '$lib/util';
  import { addFileDataLayers } from '$lib/stores/file';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon, uploadCloudIcon } from '$lib/images/icons';
  import Text from '$lib/components/UI/Text.svelte';
  import { cleanName } from '$lib/util/slugify';
  import { humanFileSize } from '$lib/util/humanFileSize';
  import notification from '$lib/stores/notification';
  import trackEvent from '$lib/util/track-event';
  import { PlausibleEvent } from '$lib/types/Plausible';

  export let show = false;
  let files: File[] = [];

  // MODAL
  let ariaLabelledBy = 'route-modal-title';
  let stickToBottom = false;
  let maxWidth = 700;
  let vw: number;
  let phase: 'SELECTING' | 'DONE' = 'SELECTING';

  $: buttonText = phase !== 'DONE' ? 'Next' : 'Show Route';
  $: buttonDisabled = phase !== 'DONE' ? files.length === 0 : false;

  $: if (!show) phase = 'SELECTING';

  $: {
    if (vw < maxWidth) stickToBottom = true;
    else stickToBottom = false;
  }

  const handleFiles = async (files: File[]): Promise<boolean> => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = getFileExtension(file.name);
      if (VALID_FILETYPE_EXTENSIONS.includes(extension)) {
        try {
          const geoJson = await fileToGeoJson(file);

          addFileDataLayers({
            name: file.name,
            geoJson: geoJson
          });
          return true;
        } catch (error) {
          notification.warning('Error while processing file', 5000);
          console.log(error);
          return false;
        }
      }
    }
    return true;
  };

  const onFileClick = (
    e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement },
    i: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    files = files.filter((_, index) => index !== i);
  };

  const clicked = async () => {
    if (phase === 'SELECTING') {
      if (files && files.length > 0) {
        const b = await handleFiles(files);
        trackEvent(PlausibleEvent.UPLOAD_ROUTE);
        if (!b) return reset();
        phase = 'DONE';
      }
    } else if (phase === 'DONE') reset();
  };

  const reset = () => {
    files = [];
    show = false;
  };

  keyboardEvent.subscribe((e) => (e?.key === 'n' ? (show = !show) : null));

  const addFiles = (eFiles: File[]) => {
    // Only add a file if it isn't in the files, otherwise display a warning
    eFiles.forEach((eFile) => {
      const alreadyInList = files.find((file) => file.name === eFile.name);
      if (alreadyInList) notification.warning('File already in list!');
      else files = [...files, eFile];
    });
  };
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
    <h2 id="Title">{$_('map.upload-route.title')}</h2>
  </div>
  <div slot="body" class="BodySection">
    <div class="modal-content">
      {#if phase === 'SELECTING'}
        <div class="file-input">
          <FileInput
            name="uploadTrailFileInput"
            on:drop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addFiles(e.detail.files);
            }}
            accept={VALID_FILETYPE_EXTENSIONS.map((ft) => '.' + ft).join(', ')}
            multiple
          >
            <div class="dropzone-content">
              {#if files.length > 0}
                <div class="fileList">
                  {#each files as file, i}
                    <button class="button-unstyle file" on:click={(e) => onFileClick(e, i)}>
                      <div class="file-left">
                        <div class="file-icon">
                          <Icon icon={crossIcon} />
                        </div>
                        <div class="file-name">
                          {cleanName(file.name)}
                        </div>
                      </div>

                      <div class="file-size">{humanFileSize(file.size)}</div>
                    </button>
                  {/each}
                </div>
              {/if}
              <div class="upload-prompt">
                <div class="icon">
                  <Icon icon={uploadCloudIcon} />
                </div>
                <div class="drag-here">
                  <Text size="l" weight="w600">
                    {@html $_('map.upload-route.drag-here', {
                      values: {
                        selectFile: `<span class="select-highlight">${$_(
                          'map.upload-route.select-file'
                        )}</span>`
                      }
                    })}
                  </Text>
                </div>
                <div class="sub-text">
                  <Text>
                    {VALID_FILETYPE_EXTENSIONS.map((ft) => '.' + ft).join(' | ')}
                  </Text>
                </div>
              </div>
            </div>
          </FileInput>
        </div>
      {:else}
        <div class="file-confirmation">
          <div class="content">
            <div class="icon">
              <Icon icon={uploadCloudIcon} />
            </div>
            <div class="drag-here">
              <Text size="l" weight="bold">{files.map((f) => cleanName(f.name)).join(', ')}</Text>
            </div>
            <div class="sub-text">
              <Text>{$_('map.upload-route.added-to-map')}</Text>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- <hr /> -->
  </div>
  <div slot="controls" class="modal-controls">
    <Button uppercase small disabled={buttonDisabled} on:click={clicked}>{buttonText}</Button>
  </div>
</Modal>

<style>
  .TitleSection {
    width: 100%;
  }

  #Title {
    font-weight: 600;
    font-size: 2rem;
    text-align: center;
  }

  @media screen and (max-width: 700px) {
    #Title {
      font-size: initial;
    }
  }

  .file-input {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .modal-content {
    border-radius: var(--modal-border-radius);
    overflow: hidden;
    border: 1px solid var(--color-gray);
  }

  :global(.dropzone) {
    border: none !important;
    border-width: 0 !important;
    border-radius: 0 !important;
  }

  .dropzone-content {
    width: 100%;
    height: 100%;
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: 2rem;
  }

  .modal-content .icon {
    height: 8rem;
  }

  .modal-content .drag-here {
    padding-top: 2rem;
  }

  .modal-content :global(.select-highlight) {
    color: var(--color-highlight-blue);
    text-decoration: underline;
  }
  .modal-content :global(.select-highlight:hover) {
    text-decoration: none;
  }

  .modal-controls {
    display: inline-flex;
    justify-content: center;
    width: 100%;
  }

  .fileList {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .fileList .file {
    display: flex;
    padding-top: 0.5rem;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }
  .fileList .file-icon {
    width: 2rem;
    height: 2rem;
  }
  .fileList .file-name {
    padding-left: 1rem;
  }

  .fileList .file-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
  }

  .file-confirmation {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    padding: 2rem;
    text-align: center;
  }

  .sub-text {
    text-align: center;
  }
</style>
