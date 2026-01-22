<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Button, FileInput, Modal } from '$lib/components/UI';
  import fileToGeoJson from '$lib/util/map/fileToGeoJson';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import {
    EXTRA_ACCEPT_VALUES,
    MOBILE_BREAKPOINT,
    VALID_FILETYPE_EXTENSIONS
  } from '$lib/constants';
  import { getFileExtension } from '$lib/util';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon, uploadCloudIcon } from '$lib/images/icons';
  import Text from '$lib/components/UI/Text.svelte';
  import { cleanName } from '$lib/util/slugify';
  import { humanFileSize } from '$lib/util/humanFileSize';
  import notification from '$lib/stores/notification';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { createTrail } from '$lib/api/trail';
  import { innerWidth } from 'svelte/reactivity/window';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';

  interface Props {
    show?: boolean;
  }

  let { show = $bindable(false) }: Props = $props();
  let files: File[] = $state([]);

  // MODAL
  let ariaLabelledBy = 'route-modal-title';
  let stickToBottom = $state(false);
  let phase: 'SELECTING' | 'DONE' = $state('SELECTING');

  let buttonText = $derived(phase !== 'DONE' ? 'Next' : 'Show Route');
  let buttonDisabled = $derived(phase !== 'DONE' ? files.length === 0 : false);

  $effect(() => {
    if (!show) phase = 'SELECTING';
    if (innerWidth.current && innerWidth.current < MOBILE_BREAKPOINT) stickToBottom = true;
    else stickToBottom = false;
  });

  const handleFiles = async (files: File[]): Promise<boolean> => {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = getFileExtension(file.name);
      if (VALID_FILETYPE_EXTENSIONS.includes(extension)) {
        try {
          const geoJson = await fileToGeoJson(file);

          createTrail({ name: file.name, geoJson });
          return true;
        } catch (error) {
          notification.warning('Error while processing file', 5000);
          logger.log(error);
          Sentry.captureException(error);
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

<Modal
  bind:show
  maxWidth="{MOBILE_BREAKPOINT}px"
  center={!stickToBottom}
  {stickToBottom}
  nopadding={stickToBottom}
  ariaLabelledBy="title"
>
  {#snippet title()}
    <div class="TitleSection" id={ariaLabelledBy}>
      <h2 id="Title">{$_('map.upload-route.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="BodySection">
      <div class="modal-content">
        {#if phase === 'SELECTING'}
          <div class="file-input">
            <FileInput
              name="uploadTrailFileInput"
              ondrop={(e) => addFiles(e.files)}
              accept={[
                ...VALID_FILETYPE_EXTENSIONS.map((ft) => '.' + ft),
                ...EXTRA_ACCEPT_VALUES
              ].join(',')}
              multiple
            >
              <div class="dropzone-content">
                {#if files.length > 0}
                  <div class="fileList">
                    {#each files as file, i}
                      <button class="button-unstyle file" onclick={(e) => onFileClick(e, i)}>
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
    </div>
  {/snippet}
  {#snippet controls()}
    <div class="modal-controls">
      <Button uppercase small disabled={buttonDisabled} onclick={clicked}>{buttonText}</Button>
    </div>
  {/snippet}
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
