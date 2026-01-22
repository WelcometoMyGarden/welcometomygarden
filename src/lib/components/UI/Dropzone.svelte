<script lang="ts">
  import { fromEvent, type FileWithPath } from 'file-selector';
  import {
    fileAccepted,
    fileMatchSize,
    isEvtWithFiles,
    isIeOrEdge,
    isPropagationStopped,
    TOO_MANY_FILES_REJECTION
  } from '$lib/util/dropzone';
  import { onDestroy, type Snippet } from 'svelte';
  import { iDeviceInfo } from '$lib/util/uaInfo';
  import type { DragEventHandler } from 'svelte/elements';

  type Props = {
    /**
     * Set accepted file types.
     * See https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept
     */
    accept: string | string[];
    disabled: boolean;
    getFilesFromEvent?: (evt: Event | any) => Promise<(FileWithPath | DataTransferItem)[]>;
    maxSize?: number;
    minSize?: number;
    multiple: boolean;
    preventDropOnDocument?: boolean;
    noClick?: boolean;
    noKeyboard?: boolean;
    noDrag?: boolean;
    noDragEventsBubbling?: boolean;
    containerClasses?: string;
    containerStyles?: string;
    disableDefaultStyles?: boolean;
    name?: string;
    ondrop: (e: { acceptedFiles: any; fileRejections: any; event: Event }) => void;
    children: Snippet;
  };

  let {
    accept,
    disabled = false,
    getFilesFromEvent = fromEvent,
    maxSize = Infinity,
    minSize = 0,
    multiple = true,
    preventDropOnDocument = true,
    noClick = false,
    noKeyboard = false,
    noDrag = false,
    noDragEventsBubbling = false,
    containerClasses = '',
    containerStyles = '',
    disableDefaultStyles = false,
    name = '',
    ondrop,
    children
  }: Props = $props();

  let state = $state({
    isFocused: false,
    isFileDialogActive: false,
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false,
    draggedFiles: [],
    acceptedFiles: [],
    fileRejections: []
  });

  let rootRef: HTMLDivElement;
  let inputRef: HTMLInputElement | null;

  function resetState() {
    state.isFileDialogActive = false;
    state.isDragActive = false;
    state.draggedFiles = [];
    state.acceptedFiles = [];
    state.fileRejections = [];
  }

  // Fn for opening the file dialog programmatically
  function openFileDialog() {
    if (inputRef) {
      inputRef.value = null; // TODO check if null needs to be set
      state.isFileDialogActive = true;
      inputRef.click();
    }
  }

  // Cb to open the file dialog when SPACE/ENTER occurs on the dropzone
  function onKeyDownCb(event: {
    target: Node | null;
    keyCode: number;
    preventDefault: () => void;
  }) {
    // Ignore keyboard events bubbling up the DOM tree
    if (!rootRef || !rootRef.isEqualNode(event.target)) {
      return;
    }
    if (event.keyCode === 32 || event.keyCode === 13) {
      event.preventDefault();
      openFileDialog();
    }
  }

  // Update focus state for the dropzone
  function onFocusCb() {
    state.isFocused = true;
  }

  function onBlurCb() {
    state.isFocused = false;
  }

  // Cb to open the file dialog when click occurs on the dropzone
  function onClickCb() {
    if (noClick) {
      return;
    }
    // In IE11/Edge the file-browser dialog is blocking, therefore, use setTimeout()
    // to ensure React can handle state changes
    // See: https://github.com/react-dropzone/react-dropzone/issues/450
    if (isIeOrEdge()) {
      setTimeout(openFileDialog, 0);
    } else {
      openFileDialog();
    }
  }

  function onDragEnterCb(event: { preventDefault?: any; target?: any }) {
    event.preventDefault();
    stopPropagation(event);
    dragTargetsRef = [...dragTargetsRef, event.target];
    if (isEvtWithFiles(event)) {
      Promise.resolve(getFilesFromEvent(event)).then((draggedFiles) => {
        if (isPropagationStopped(event) && !noDragEventsBubbling) {
          return;
        }
        state.draggedFiles = draggedFiles;
        state.isDragActive = true;
      });
    }
  }

  function onDragOverCb(event: {
    preventDefault?: any;
    dataTransfer?: any;
    stopPropagation?: () => void;
  }) {
    event.preventDefault();
    stopPropagation(event);
    if (event.dataTransfer) {
      try {
        event.dataTransfer.dropEffect = 'copy';
      } catch {} /* eslint-disable-line no-empty */
    }
    return false;
  }

  function onDragLeaveCb(event: {
    preventDefault?: any;
    target?: any;
    stopPropagation?: () => void;
  }) {
    event.preventDefault();
    stopPropagation(event);
    // Only deactivate once the dropzone and all children have been left
    const targets = dragTargetsRef.filter((target) => rootRef && rootRef.contains(target));
    // Make sure to remove a target present multiple times only once
    // (Firefox may fire dragenter/dragleave multiple times on the same element)
    const targetIdx = targets.indexOf(event.target);
    if (targetIdx !== -1) {
      targets.splice(targetIdx, 1);
    }
    dragTargetsRef = targets;
    if (targets.length > 0) {
      return;
    }
    state.isDragActive = false;
    state.draggedFiles = [];
  }

  function onDropCb(event: { preventDefault?: any; stopPropagation?: () => void }) {
    event.preventDefault();
    stopPropagation(event);
    dragTargetsRef = [];
    if (isEvtWithFiles(event)) {
      Promise.resolve(getFilesFromEvent(event)).then((files) => {
        if (isPropagationStopped(event) && !noDragEventsBubbling) {
          return;
        }
        const acceptedFiles: (FileWithPath | DataTransferItem)[] = [];
        const fileRejections: {
          file: FileWithPath | DataTransferItem;
          errors: any[] | { code: string; message: string }[];
        }[] = [];
        files.forEach((file) => {
          const [accepted, acceptError] = fileAccepted(file, accept);
          const [sizeMatch, sizeError] = fileMatchSize(file, minSize, maxSize);
          if (accepted && sizeMatch) {
            acceptedFiles.push(file);
          } else {
            const errors = [acceptError, sizeError].filter((e) => e);
            fileRejections.push({ file, errors });
          }
        });
        if (!multiple && acceptedFiles.length > 1) {
          // Reject everything and empty accepted files
          acceptedFiles.forEach((file) => {
            fileRejections.push({ file, errors: [TOO_MANY_FILES_REJECTION] });
          });
          acceptedFiles.splice(0);
        }
        state.acceptedFiles = acceptedFiles;
        state.fileRejections = fileRejections;
        ondrop({
          acceptedFiles,
          fileRejections,
          event
        });
      });
    }
    resetState();
  }

  function composeHandler(fn: {
    (event: any): void;
    (): void;
    (): void;
    (event: any): void;
    (event: any): boolean;
    (event: any): void;
    (event: any): void;
    (): void;
  }) {
    return disabled ? null : fn;
  }

  function composeKeyboardHandler(fn: { (event: any): void; (): void; (): void }) {
    return noKeyboard ? null : composeHandler(fn);
  }

  function composeDragHandler(fn: {
    (event: any): void;
    (event: any): boolean;
    (event: any): void;
    (event: any): void;
  }) {
    return noDrag ? null : composeHandler(fn);
  }

  function stopPropagation(event: { stopPropagation: () => void }) {
    if (noDragEventsBubbling) {
      event.stopPropagation();
    }
  }

  // allow the entire document to be a drag target
  function onDocumentDragOver(event: { preventDefault: () => void }) {
    if (preventDropOnDocument) {
      event.preventDefault();
    }
  }

  let dragTargetsRef: any[] = [];

  const onDocumentDrop = ((event) => {
    if (!preventDropOnDocument || !event.target) {
      return;
    }
    if (rootRef && rootRef.contains(event.target as HTMLElement)) {
      // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
      return;
    }
    event.preventDefault();
    dragTargetsRef = [];
  }) satisfies DragEventHandler<Window>;

  // Update file dialog active state when the window is focused on
  function onWindowFocus() {
    // Execute the timeout only if the file dialog is opened in the browser
    if (state.isFileDialogActive) {
      setTimeout(() => {
        if (inputRef) {
          const { files } = inputRef;
          if (files && !files.length) {
            state.isFileDialogActive = false;
          }
        }
      }, 300);
    }
  }

  onDestroy(() => {
    // This is critical for canceling the timeout behaviour on `onWindowFocus()`
    inputRef = null;
  });

  function onInputElementClick(event: { stopPropagation: () => void }) {
    event.stopPropagation();
  }

  const { isIDevice } = iDeviceInfo || {};
</script>

<svelte:window onfocus={onWindowFocus} ondragover={onDocumentDragOver} ondrop={onDocumentDrop} />

<div
  bind:this={rootRef}
  class="{disableDefaultStyles ? '' : 'dropzone'}
  {containerClasses}"
  style={containerStyles}
  onkeydown={composeKeyboardHandler(onKeyDownCb)}
  onfocus={composeKeyboardHandler(onFocusCb)}
  onblur={composeKeyboardHandler(onBlurCb)}
  onclick={composeHandler(onClickCb)}
  ondragenter={composeDragHandler(onDragEnterCb)}
  ondragover={composeDragHandler(onDragOverCb)}
  ondragleave={composeDragHandler(onDragLeaveCb)}
  ondrop={composeDragHandler(onDropCb)}
  role="button"
  aria-dropeffect="execute"
  tabindex="0"
>
  <!-- Note: the accept attribute is ignored on iOS, because on some iPhones (e.g. 13, SE 2020, with iOS 17.6+)
        The accept attribute doesn't work as intended, and makes it impossible to select gpx files.
       Note: multipart/form-data is added here for futureproofing, in case we ever want to
        progressively enhance this action, see https://kit.svelte.dev/docs/migrating-to-sveltekit-2#forms-containing-file-inputs-must-use-multipart-form-data
    -->
  <input
    accept={isIDevice ? undefined : Array.isArray(accept) ? accept.join(',') : accept}
    {multiple}
    type="file"
    {name}
    autocomplete="off"
    onchange={onDropCb}
    onclick={onInputElementClick}
    bind:this={inputRef}
    style="display: none;"
    formenctype="multipart/form-data"
  />
  {@render children?.()}
</div>

<style>
  .dropzone {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    border-width: 2px;
    border-radius: 2px;
    border-color: #eeeeee;
    border-style: dashed;
    background-color: #fafafa;
    outline: none;
    transition: border 0.24s ease-in-out;
    cursor: pointer;
  }

  @media screen and (min-width: 701px) {
    .dropzone {
      /* Why: make sure the dropzone scales so that its containing modal never exceeds
      the vertical viewport bounds (in case of a vertically small screen),
      however, keep it max 340px high on tall screens */
      height: min(340px, calc(0.5 * (var(--vh, 1vh) * 100 - var(--height-nav))));
      flex-grow: 1;
    }

    @supports (height: 100dvh) {
      .dropzone {
        height: min(340px, calc(0.5 * (100dvh - var(--height-nav))));
      }
    }
  }

  .dropzone:focus {
    border-color: var(--color-green);
  }
</style>
