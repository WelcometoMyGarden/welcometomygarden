<script lang="ts">
  import { Label } from '$lib/components/UI';

  export let files: FileList;
  export let disabled = false;
</script>

<Label label="Upload your trail">
  <input
    {disabled}
    type="file"
    accept=".geojson,.gpx"
    bind:files
    on:change
    class="border border-gray-500 w-full focus:ring-blue-600 bg-white
      rounded focus:outline-none focus:ring-2 focus:border-transparent"
  />
</Label>
