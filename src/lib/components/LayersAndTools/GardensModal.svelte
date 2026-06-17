<script lang="ts">
  import { _ } from 'svelte-i18n';
  import MapToolModal from '$lib/components/LayersAndTools/MapToolModal.svelte';
  import GardensTools from '$lib/components/LayersAndTools/GardensTools.svelte';

  interface Props {
    show?: boolean;
    showGardens: boolean;
    showSavedGardens: boolean;
  }

  let {
    show = $bindable(false),
    showGardens = $bindable(),
    showSavedGardens = $bindable()
  }: Props = $props();
</script>

<MapToolModal bind:show heading={$_('map.gardens.title')}>
  <GardensTools bind:showGardens bind:showSavedGardens />
</MapToolModal>
