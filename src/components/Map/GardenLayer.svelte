<script>
  export let allGardens;
  export let selectedGardenId;

  import { getContext, createEventDispatcher, onMount } from 'svelte';
  import mapboxgl from 'mapbox-gl';
  import key from './mapbox-context.js';

  const { getMap } = getContext(key);
  const map = getMap();

  const dispatch = createEventDispatcher();

  let gardens = [];
  if (allGardens)
    gardens = Object.keys(allGardens).map(uid => {
      const garden = allGardens[uid];
      return {
        id: uid,
        ...garden,
        lnglat: [garden.location.longitude, garden.location.latitude],
        icon: {
          className: 'garden-marker'
        }
      };
    });

  onMount(() => {
    gardens.forEach(garden => {
      new mapboxgl.Marker(garden.element).setLngLat(garden.lnglat).addTo(map);
    });
  });
</script>

{#each gardens as garden (garden.id)}
  <button
    class="button-container marker"
    on:click={() => dispatch('garden-click', garden)}
    bind:this={garden.element}
    class:selected={selectedGardenId === garden.id} />
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
