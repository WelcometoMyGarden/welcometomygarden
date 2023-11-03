<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '$lib/stores/auth';
  import { getContext, onDestroy } from 'svelte';
  import type { ContextType } from './Map.svelte';
  import key from './mapbox-context.js';
  import type { Map, MapEventType, EventData } from 'maplibre-gl';
  import { nonMemberMaxZoom } from '$lib/constants';
  import { Anchor } from '../UI';
  import createUrl from '$lib/util/create-url';
  import routes from '$lib/routes';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import MapNotice from './MapNotice.svelte';
  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  let showNotice = false;

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

  const zoomEventHandler = (e: MapEventType['zoom'] & EventData) => {
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
  <Anchor
    href={createUrl(routes.ABOUT_MEMBERSHIP)}
    track={[PlausibleEvent.VISIT_ABOUT_MEMBERSHIP, { source: 'zoom_notice' }]}
    newtab>{$_('generics.become-member')}</Anchor
  >{' '}{$_('map.zoom-restriction-notice')}.
</MapNotice>
