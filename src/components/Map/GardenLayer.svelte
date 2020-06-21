<script>
  export let gardens;
  export let selectedGardenId;

  import { getContext, createEventDispatcher, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import key from './mapbox-context.js';

  const { getMap } = getContext(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  let features = [];
  $: features = Object.keys(gardens).map(uid => {
    const garden = gardens[uid];
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [garden.location.longitude, garden.location.latitude]
      },
      properties: {
        id: uid,
        ...garden,
        icon: {
          className: 'garden-marker'
        }
      }
    };
  });

  map.on('load', () => {
    map.addSource('gardens', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features
      }
    });
  });

  onMount(() => {
    features.forEach(feature => {
      new mapboxgl.Marker(feature.properties.element)
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);
    });
  });
</script>

{#each features as feature (feature.properties.id)}
  <button
    class="button-container marker"
    on:click={() => dispatch('garden-click', feature)}
    bind:this={feature.properties.element}
    class:selected={selectedGardenId === feature.properties.id} />
{/each}

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

  :global(.marker.selected) {
    background-image: url('/images/icons/tent-white.svg');
    background-color: var(--color-green);
  }
</style>
