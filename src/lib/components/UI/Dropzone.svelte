<script lang="ts">
  import { fromEvent, type FileWithPath } from 'file-selector';
  import {
    allFilesAccepted,
    composeEventHandlers,
    fileAccepted,
    fileMatchSize,
    isEvtWithFiles,
    isIeOrEdge,
    isPropagationStopped,
    TOO_MANY_FILES_REJECTION
  } from '$lib/util/dropzone';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  //props
  /**
   * Set accepted file types.
   * See https://github.com/okonet/attr-accept for more information.
   */
  export let accept: string | string[];
  export let disabled = false;
  export let getFilesFromEvent = fromEvent;
  export let maxSize = Infinity;
  export let minSize = 0;
  export let multiple = true;
  export let preventDropOnDocument = true;
  export let noClick = false;
  export let noKeyboard = false;
  export let noDrag = false;
  export let noDragEventsBubbling = false;
  export let containerClasses = '';
  export let containerStyles = '';
  export let disableDefaultStyles = false;
  export let name = '';
  const dispatch = createEventDispatcher();
  //state
  let state = {
    isFocused: false,
    isFileDialogActive: false,
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false,
    draggedFiles: [],
    acceptedFiles: [],
    fileRejections: []
  };
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
        dispatch('dragenter', {
          dragEvent: event
        });
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
    if (isEvtWithFiles(event)) {
      dispatch('dragover', {
        dragEvent: event
      });
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
    if (isEvtWithFiles(event)) {
      dispatch('dragleave', {
        dragEvent: event
      });
    }
  }
  function onDropCb(event: { preventDefault?: any; stopPropagation?: () => void }) {
    event.preventDefault();
    stopPropagation(event);
    dragTargetsRef = [];
    if (isEvtWithFiles(event)) {
      dispatch('filedropped', {
        event
      });
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
        dispatch('drop', {
          acceptedFiles,
          fileRejections,
          event
        });
        if (fileRejections.length > 0) {
          dispatch('droprejected', {
            fileRejections,
            event
          });
        }
        if (acceptedFiles.length > 0) {
          dispatch('dropaccepted', {
            acceptedFiles,
            event
          });
        }
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
  function onDocumentDrop(event: { target: Node | null; preventDefault: () => void }) {
    if (!preventDropOnDocument) {
      return;
    }
    if (rootRef && rootRef.contains(event.target)) {
      // If we intercepted an event for our instance, let it propagate down to the instance's onDrop handler
      return;
    }
    event.preventDefault();
    dragTargetsRef = [];
  }
  // Update file dialog active state when the window is focused on
  function onWindowFocus() {
    // Execute the timeout only if the file dialog is opened in the browser
    if (state.isFileDialogActive) {
      setTimeout(() => {
        if (inputRef) {
          const { files } = inputRef;
          if (files && !files.length) {
            state.isFileDialogActive = false;
            dispatch('filedialogcancel');
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
</script>

<!-- <Label {label}>
  <input {disabled} type="file" {accept} bind:files on:change {multiple} />
</Label> -->

<svelte:window on:focus={onWindowFocus} on:dragover={onDocumentDragOver} on:drop={onDocumentDrop} />

<div
  bind:this={rootRef}
  class="{disableDefaultStyles ? '' : 'dropzone'}
  {containerClasses}"
  style={containerStyles}
  on:keydown={composeKeyboardHandler(onKeyDownCb)}
  on:focus={composeKeyboardHandler(onFocusCb)}
  on:blur={composeKeyboardHandler(onBlurCb)}
  on:click={composeHandler(onClickCb)}
  on:dragenter={composeDragHandler(onDragEnterCb)}
  on:dragover={composeDragHandler(onDragOverCb)}
  on:dragleave={composeDragHandler(onDragLeaveCb)}
  on:drop={composeDragHandler(onDropCb)}
>
  <input
    accept={Array.isArray(accept) ? accept.join(', ') : accept}
    {multiple}
    type="file"
    {name}
    autocomplete="off"
    on:change={onDropCb}
    on:click={onInputElementClick}
    bind:this={inputRef}
    style="display: none;"
  />
  <slot>
    <slot />
  </slot>
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
      height: min(340px, calc(0.5 * (100vh - var(--height-nav))));
      flex-grow: 1;
    }
  }

  .dropzone:focus {
    border-color: var(--color-green);
  }
</style>
