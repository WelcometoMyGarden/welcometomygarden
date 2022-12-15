<script lang="ts">
  import Dropzone from '@/lib/components/UI/Dropzone.svelte';
  import { createEventDispatcher } from 'svelte';

  export let name: string;
  export let disabled: boolean = false;
  export let accept: string;
  export let multiple: boolean = false;

  const dispatch = createEventDispatcher();

  let localFiles: { accepted: File[]; rejected: File[] } = {
    accepted: [],
    rejected: []
  };

  const handleFilesSelect = (e: { detail: { acceptedFiles: any; fileRejections: any } }) => {
    const { acceptedFiles, fileRejections } = e.detail;
    localFiles.accepted = [...localFiles.accepted, ...acceptedFiles];
    localFiles.rejected = [...localFiles.rejected, ...fileRejections];
    dispatch('drop', { files: [...acceptedFiles] });
  };
</script>

<Dropzone {name} {accept} on:drop={handleFilesSelect} {multiple} {disabled}>
  <slot />
</Dropzone>
