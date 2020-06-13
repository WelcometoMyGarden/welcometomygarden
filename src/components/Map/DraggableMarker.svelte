<script>
  export let lat;
  export let lon;
  export let label;

  import { getContext, createEventDispatcher, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import key from './mapbox-context.js';

  const dispatch = createEventDispatcher();

  const { getMap } = getContext(key);
  const map = getMap();

  let markerElement;

  onMount(() => {
    const popup = new mapboxgl.Popup({
      offset: 25,
      closeButton: false,
      closeOnClick: false,
      className: 'popup'
    }).setText(label);

    const marker = new mapboxgl.Marker({
      draggable: true,
      element: markerElement
    })
      .setLngLat([lon, lat])
      .setPopup(popup)
      .addTo(map);

    markerElement.click();

    const onDragEnd = () => {
      const lngLat = marker.getLngLat();

      dispatch('dragged', {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      });
    };

    marker.on('dragstart', popup.remove);
    marker.on('dragend', onDragEnd);
  });
</script>

<div bind:this={markerElement} class="marker" />

<style>
  .marker {
    background-image: url('/images/icons/tent.svg');
    background-size: 3.5rem auto;
    background-repeat: no-repeat;
    background-position: center center;
    background-color: var(--color-white);
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    cursor: pointer;
  }

  :global(.popup) {
    font-weight: 700;
    font-family: var(--fonts-copy);
  }
</style>
