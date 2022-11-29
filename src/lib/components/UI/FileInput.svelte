<script lang="ts">
  import { Label } from '$lib/components/UI';

  export let files: FileList;
  export let disabled = false;
  export let accept: string;
  export let multiple = false;
</script>

<Label label="Upload your trail">
  <input {disabled} type="file" {accept} bind:files on:change {multiple} />
</Label>
