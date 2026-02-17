<script lang="ts">
  import type { ContextType } from './Map.svelte';

  import { getContext, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import key from './mapbox-context.js';
  import type { LongLat } from '$lib/types/Garden';
  interface Props {
    lat: any;
    lon: any;
    label: any;
    filled?: boolean;
    ondragged: (ll: LongLat) => void;
  }

  let { lat, lon, label, filled = false, ondragged }: Props = $props();

  const { getMap } = getContext<ContextType>(key);
  const map = getMap();

  let markerElement = $state();
  let marker = $state();
  onMount(() => {
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      closeOnClick: false,
      className: 'popup'
    }).setText(label);

    marker = new mapboxgl.Marker({
      draggable: true,
      element: markerElement
    })
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(map);

    if (!filled) markerElement.click();

    const onDragEnd = () => {
      const lngLat = marker.getLngLat();

      ondragged({
        latitude: lngLat.lat,
        longitude: lngLat.lng
      });
    };

    marker.on('dragstart', popup.remove);
    marker.on('dragend', onDragEnd);
  });

  $effect(() => {
    if (marker && lat && lon) marker.setLngLat([lon, lat]);
  });
</script>

<div bind:this={markerElement} class="marker" class:filled></div>

<style>
  .marker {
    background-image: url('/images/icons/tent.svg');
    background-size: 3.5rem auto;
    background-repeat: no-repeat;
    background-position: center center;
    background-color: var(--color-white);
    box-shadow: 0px 0px 2rem rgba(0, 0, 0, 0.1);
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    cursor: pointer;
    transition: background-color 300ms ease;
  }

  .marker.filled {
    background-image: url('/images/icons/tent-white.svg');
    background-color: var(--color-green);
  }

  :global(.popup) {
    font-weight: 700;
    font-family: var(--fonts-copy);
  }
</style>
