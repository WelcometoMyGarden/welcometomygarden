<script lang="ts">
  import { _ } from 'svelte-i18n';
  import MapToolModal from '$lib/components/LayersAndTools/MapToolModal.svelte';
  import TrailsTool from '$lib/components/LayersAndTools/TrailsTool.svelte';

  interface Props {
    show?: boolean;
    showHiking: boolean;
    showCycling: boolean;
    onclick: (e: MouseEvent) => void;
  }

  let {
    show = $bindable(false),
    showHiking = $bindable(),
    showCycling = $bindable(),
    onclick
  }: Props = $props();
</script>

<MapToolModal bind:show heading={$_('map.routes.title-modal')}>
  <TrailsTool bind:showCycling bind:showHiking {onclick} inModal />
</MapToolModal>
