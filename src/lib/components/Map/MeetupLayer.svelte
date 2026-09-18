<script module lang="ts">
  // Data & types, usable by other components too
  export const MEETUP_ID = 'meetups';
  export type Meetup = {
    id: string;
    date: Date;
    // Time (local) after which the meetup pin is removed from the map.
    hideAt: Date;
    // place name
    place: string;
    lnglat: [number, number];
    registrationLink: string;
  };

  export const meetups: Meetup[] = [
    {
      id: 'eindhoven-2026',
      // Use local time
      date: new Date(2026, 10 - 1, 24),
      hideAt: new Date(2026, 10 - 1, 24, 16, 0),
      place: 'Eindhoven',
      lnglat: [5.3587, 51.414003],
      registrationLink: `https://meetup.welcometomygarden.org/eindhoven`
    }
  ];
</script>

<script lang="ts">
  // Note: assumes that the parent component has already loaded the map on component load
  import { getContext } from 'svelte';
  import type { ContextType } from './Map.svelte';
  import key from './mapbox-context.js';
  import type GeoJSON from 'geojson';
  import type { GeoJSONSource, MapMouseEvent } from 'mapbox-gl/esm';

  import { gardenLayerLoaded } from '$lib/stores/app';
  import { loadImg } from '$lib/api/mapbox';
  import { isUserLoading, user } from '$lib/stores/auth';
  import { hasLoaded } from '$lib/stores/garden';

  interface Props {
    selectedMeetupId: undefined | string;
    onMeetupClick: (meetupId: string) => void;
  }

  let { selectedMeetupId, onMeetupClick }: Props = $props();
  let loaded = $state(false);

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();
  const _onMeetupClick = (e: MapMouseEvent) => {
    // will be serialized, but we only need the id!
    const meetup = e.features?.[0]?.properties;
    if (meetup) onMeetupClick(meetup.id);
  };
  const meetupFeatureCollection: () => GeoJSON.FeatureCollection = () => ({
    type: 'FeatureCollection',
    features: meetups
      // hide meetups once their configured end time has passed
      .filter(({ hideAt }) => new Date().getTime() < hideAt.getTime())
      .map((m) => ({
        type: 'Feature',
        properties: {
          ...m,
          // For easier serialization, arrays are serialized as strings.
          icon: selectedMeetupId === m.id ? 'fireplace-selected' : 'fireplace'
        },
        geometry: {
          type: 'Point',
          coordinates: m.lnglat
        }
      }))
  });

  async function loadLayer() {
    map.addSource(MEETUP_ID, {
      type: 'geojson',
      data: meetupFeatureCollection()
    });
    map
      .addLayer({
        id: MEETUP_ID,
        type: 'symbol',
        source: MEETUP_ID,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.4,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      })
      .moveLayer(MEETUP_ID);

    // Add click handler
    map.on('click', MEETUP_ID, _onMeetupClick);

    // Add hover handlers
    // TODO: copy-pasted from GardenLayer, probably should be refactored as utilities
    map.on('mouseenter', MEETUP_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', MEETUP_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    loaded = true;
  }

  $effect(() => {
    // Only load the meetup layer after the garden layer, to ensure it layered on top.
    if (
      !loaded &&
      $gardenLayerLoaded &&
      !$isUserLoading &&
      $hasLoaded &&
      (!!$user?.garden || $user?.superfan)
    ) {
      Promise.all(
        [
          {
            url: '/images/markers/fireplace.png',
            id: 'fireplace'
          },
          { url: '/images/markers/fireplace-yellow.png', id: 'fireplace-selected' }
        ].map((img) => loadImg(map, img))
      ).then(loadLayer);
    }

    // Update data when meetup ID changes
    if (loaded) {
      map.getSource<GeoJSONSource>(MEETUP_ID)?.setData(meetupFeatureCollection());
    }
  });
</script>
