<script>
  import Map from '@/components/Map/Map.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
</script>

<div>
  <Map lat="50.5" lon="4.5" zoom="7">
    <GardenLayer />
  </Map>
</div>

<style>
  div {
    width: 100%;
    height: calc(100vh - var(--height-footer));
    position: fixed;
    top: 0;
    left: 0;
  }

  div :global(.mapboxgl-ctrl-top-left) {
    top: calc(var(--height-nav) + 0.5rem);
  }
</style>
