<script context="module" lang="ts">
  // Data & types, usable by other components too
  export const MEETUP_ID = 'meetups';
  export type Meetup = {
    id: string;
    date: Date;
    // place name
    place: string;
    lnglat: [number, number];
    registrationLink: string;
  };

  export const meetups: Meetup[] = [
    {
      id: 'bruges-2025',
      // Use local time
      date: new Date(2025, 6 - 1, 26),
      place: 'Bruges',
      lnglat: [3.244532, 51.2070776],
      registrationLink: `https://meetup.welcometomygarden.org/brugge`
    }
  ];
</script>

<script lang="ts">
  // Note: assumes that the parent component has already loaded the map on component load
  import { createEventDispatcher, getContext } from 'svelte';
  import type { ContextType } from './Map.svelte';
  import key from './mapbox-context.js';
  import type GeoJSON from 'geojson';
  import type maplibregl from 'maplibre-gl';
  import { gardenLayerLoaded } from '$lib/stores/app';
  import { loadImg } from '$lib/api/mapbox';
  import { isUserLoading, user } from '$lib/stores/auth';
  import { hasLoaded } from '$lib/stores/garden';

  export let selectedMeetupId: undefined | string;
  let loaded = false;

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();
  const dispatch = createEventDispatcher();
  const onMeetupClick = (e: maplibregl.MapMouseEvent) => {
    // will be serialized, but we only need the id!
    const meetup = e.features?.[0]?.properties;
    dispatch('meetup-click', meetup.id);
  };
  const meetupFeatureCollection: () => GeoJSON.FeatureCollection = () => ({
    type: 'FeatureCollection',
    features: meetups
      // hide meetups, margin of 10 hours
      .filter(({ date }) => new Date().getTime() < date.getTime() + 1000 * 3600 * 10)
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
    map.on('click', MEETUP_ID, onMeetupClick);

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

  // Only load the meetup layer after the garden layer, to ensure it layered on top.
  $: if (
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
  $: if (loaded) {
    map.getSource(MEETUP_ID).setData(meetupFeatureCollection(selectedMeetupId));
  }
</script>
