<script lang="ts">
  import Dropzone from '$lib/components/UI/Dropzone.svelte';
  import type { Snippet } from 'svelte';
  interface Props {
    name: string;
    disabled?: boolean;
    accept: string;
    multiple?: boolean;
    ondrop: (e: { files: any[] }) => void;
    children?: Snippet;
  }

  let { name, disabled = false, accept, multiple = false, ondrop, children }: Props = $props();

  let localFiles: { accepted: File[]; rejected: File[] } = {
    accepted: [],
    rejected: []
  };

  const handleFilesSelect = (e: { acceptedFiles: any; fileRejections: any; event: Event }) => {
    const { acceptedFiles, fileRejections } = e;
    localFiles.accepted = [...localFiles.accepted, ...acceptedFiles];
    localFiles.rejected = [...localFiles.rejected, ...fileRejections];
    ondrop({ files: [...acceptedFiles] });
  };
</script>

<Dropzone {name} {accept} ondrop={handleFilesSelect} {multiple} {disabled}>
  {@render children?.()}
</Dropzone>
