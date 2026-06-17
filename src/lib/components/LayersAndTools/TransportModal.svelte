<script lang="ts">
  import { _ } from 'svelte-i18n';
  import MapToolModal from '$lib/components/LayersAndTools/MapToolModal.svelte';
  import TransportTools from '$lib/components/LayersAndTools/TransportTools.svelte';

  interface Props {
    show?: boolean;
    showTransport: boolean;
  }

  let { show = $bindable(false), showTransport = $bindable() }: Props = $props();
</script>

<MapToolModal bind:show heading={$_('map.railway.title-modal')}>
  <TransportTools bind:showTransport />
</MapToolModal>
