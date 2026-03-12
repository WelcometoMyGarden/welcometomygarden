<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '$lib/stores/auth';
  import { getContext, onDestroy } from 'svelte';
  import type { ContextType } from './Map.svelte';
  import key from './mapbox-context.js';
  import type { Map } from 'mapbox-gl';
  import { nonMemberMaxZoom } from '$lib/constants';
  import { Anchor } from '../UI';
  import createUrl from '$lib/util/create-url';
  import routes from '$lib/routes';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import MapNotice from './MapNotice.svelte';
  import { lr } from '$lib/util/translation-helpers';
  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  let { onclick }: { onclick: (e: MouseEvent) => void } = $props();

  let showNotice = $state(false);

  /**
   * Determines if the zoom restriciton notice should be shown for map instance in its current state,
   * and displays it if so.
   */
  function toggleNoticeOnMapZoom(map: Map) {
    if (map.getZoom() >= nonMemberMaxZoom) {
      showNotice = true;
    } else {
      showNotice = false;
    }
  }

  const zoomEventHandler = (e: { type: 'zoom'; target: mapboxgl.Map }) => {
    toggleNoticeOnMapZoom(e.target);
  };

  if (!$user?.superfan) {
    // Show the notice on load time if needed.
    toggleNoticeOnMapZoom(map);

    // Using this event instead of 'zoomend' results in a more responsive appearance of the notice.
    map.on('zoom', zoomEventHandler);
  }

  onDestroy(() => {
    map.off('zoom', zoomEventHandler);
  });
</script>

<MapNotice bind:show={showNotice}>
  ℹ️{' '}
  <!-- Note: this will still track the 'zoom_notice' event despite not opening the link -->
  <Anchor
    href={createUrl($lr(routes.ABOUT_MEMBERSHIP))}
    preventing
    track={[PlausibleEvent.OPEN_MEMBERSHIP_MODAL, { source: 'zoom_notice' }]}
    {onclick}
    newtab>{$_('generics.become-member')}</Anchor
  >{' '}{$_('map.zoom-restriction-notice')}.
</MapNotice>
