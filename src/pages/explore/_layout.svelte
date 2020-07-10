<script>
  import { onMount, onDestroy } from 'svelte';
  import { goto, params } from '@sveltech/routify';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import Drawer from '@/components/Garden/Drawer.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import routes from '@/routes';
  import { Progress } from '@/components/UI';

  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$params.gardenId];
  $: center = selectedGarden
    ? [selectedGarden.location.longitude, selectedGarden.location.latitude]
    : [4.5, 50.5];

  const selectGarden = garden => {
    const newSelectedId = garden.id;
    const newGarden = $allGardens[newSelectedId];
    center = [newGarden.location.longitude, newGarden.location.latitude];
    $goto(`${routes.MAP}/garden/${newSelectedId}`);
  };

  const closeDrawer = () => {
    $goto(routes.MAP);
  };

  onMount(async () => {
    if (Object.keys($allGardens).length === 0) {
      try {
        await getAllListedGardens();
      } catch (ex) {
        console.log(ex);
        isFetchingGardens.set(false);
      }
    }
  });

  onDestroy(() => {
    isFetchingGardens.set(false);
  });
</script>

<Progress active={$isFetchingGardens} />
<div class="map-section">
  <Map lat={center[1]} lon={center[0]} recenterOnUpdate zoom="7">
    {#if !$isFetchingGardens}
      <GardenLayer
        on:garden-click={e => selectGarden(e.detail)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={$allGardens} />
      <Drawer on:close={closeDrawer} garden={selectedGarden} />
      <slot />
    {/if}
    <div class="vehicle-notice-wrapper">
      <div class="vehicle-notice">
        <div class="image-container">
          <img src="/images/no-car.svg" alt="No vehicle allowed" />
        </div>
        <h3>Welcome To My Garden is for slow travellers only.</h3>
        <p class="mt-m">
          If you're planning to travel by motorized vehicle, please do not contact hosts via this
          platform. Thank you for understanding!
        </p>
      </div>
    </div>
  </Map>

</div>

<style>
  .map-section {
    width: 100%;
    height: calc(calc(var(--vh, 1vh) * 100) - var(--height-footer));
    position: fixed;
    top: 0;
    left: 0;
  }

  .map-section :global(.mapboxgl-ctrl-top-left) {
    top: calc(var(--height-nav) + 0.5rem);
  }

  .vehicle-notice-wrapper {
    width: 45rem;
    height: 30rem;
    box-shadow: 0px 0px 21.5877px rgba(0, 0, 0, 0.1);
    position: fixed;
    bottom: var(--height-footer);
    left: 0;
    background-color: var(--color-white);
    border-radius: 0.6rem;
  }

  .vehicle-notice {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    flex-direction: column;
    text-align: center;
    padding: 1.5rem;
    font-family: var(--fonts-copy);
    width: 100%;
    height: 100%;
  }

  .vehicle-notice h3 {
    font-size: 1.8rem;
    line-height: 1.4;
    text-transform: uppercase;
    position: relative;
    font-weight: 900;
  }

  .vehicle-notice h3::after {
    content: '';
    width: 16rem;
    position: absolute;
    bottom: -1rem;
    left: calc(50% - 8rem);
    height: 0.4rem;
    background: var(--color-orange-light);
    border-radius: 0.5rem;
  }

  .vehicle-notice p {
    font-size: 1.4rem;
  }

  .vehicle-notice .image-container {
    width: 10rem;
    height: 10rem;
  }

  .vehicle-notice .image-container img {
    max-width: 100%;
  }

  @media screen and (max-width: 700px) {
    .map-section {
      height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    }
    .map-section :global(.mapboxgl-ctrl-top-left) {
      top: 0;
    }
    .map-section :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
    }
  }
</style>
