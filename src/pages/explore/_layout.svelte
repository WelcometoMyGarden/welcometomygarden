<script>
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { goto, params } from '@roxi/routify';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import routes from '@/routes';

  import Map from '@/components/Map/Map.svelte';
  import Drawer from '@/components/Garden/Drawer.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '@/components/Map/WaymarkedTrails.svelte';
  import Filter from '@/components/Garden/Filter.svelte';
  import { Progress, LabeledCheckbox, Icon } from '@/components/UI';

  import { getCookie, setCookie } from '@/util';
  import { crossIcon, cyclistIcon, hikerIcon } from '@/images/icons';
  import { ZOOM_LEVELS } from '@/constants';

  const fallbackLocation = { longitude: 4.5, latitude: 50.5 };

  /**
   * URL with gardenId
   */

  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$params.gardenId];

  // true when visiting the link to a garden directly, used to increase zoom level
  let usingGardenLink = !!$params.gardenId;

  const selectGarden = (garden) => {
    const newSelectedId = garden.id;
    const newGarden = $allGardens[newSelectedId];
    center = { longitude: newGarden.location.longitude, latitude: newGarden.location.latitude };
    $goto(`${routes.MAP}/garden/${newSelectedId}`);

    usingGardenLink = false;
  };

  /**
   * center
   */

  $: center = selectedGarden
    ? { longitude: selectedGarden.location.longitude, latitude: selectedGarden.location.latitude }
    : fallbackLocation;

  const closeDrawer = () => {
    $goto(routes.MAP);
  };

  /**
   * onMount lifecycle hook
   */

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

  /**
   * Car Notice
   */

  let carNoticeShown = !getCookie('car-notice-dismissed');

  const closeCarNotice = () => {
    const date = new Date();
    // one year
    date.setTime(date.getTime() + 365 * 86400000); //24 * 60 * 60 * 1000
    setCookie('car-notice-dismissed', true, { expires: date.toGMTString() });
    carNoticeShown = false;
  };

  /**
   *  Waymarked Trails
   */

  let showHiking = false;
  let showCycling = false;

  /**
   *  Filter
   */
  let filteredGardens;

  /**
   * onDestroy lifecycle hook
   */

  onDestroy(() => {
    isFetchingGardens.set(false);
  });
</script>

<Progress active={$isFetchingGardens} />
<div class="map-section">
  <Map
    lon={center.longitude}
    lat={center.latitude}
    jump={usingGardenLink}
    recenterOnUpdate
    zoom={usingGardenLink ? ZOOM_LEVELS.ROAD : ZOOM_LEVELS.SMALL_COUNTRY}
  >
    {#if !$isFetchingGardens}
      <GardenLayer
        on:garden-click={(e) => selectGarden(e.detail)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={filteredGardens || $allGardens}
      />
      <Drawer on:close={closeDrawer} garden={selectedGarden} />
      <WaymarkedTrails {showHiking} {showCycling} />
      <slot />
    {/if}
    {#if carNoticeShown}
      <div class="vehicle-notice-wrapper">
        <button on:click={closeCarNotice} aria-label="Close notice" class="button-container close">
          <Icon icon={crossIcon} />
        </button>

        <div class="vehicle-notice">
          <div class="image-container">
            <img src="/images/no-car.svg" alt="No vehicle allowed" />
          </div>
          <h3>{$_('map.vehicle-notice.title')}</h3>
          <p class="mt-m">{$_('map.vehicle-notice.text')}</p>
        </div>
      </div>
    {/if}
  </Map>
  <div class="trails">
    <div>
      <LabeledCheckbox
        name="hiking"
        icon={hikerIcon}
        label={$_('map.trails.hiking')}
        bind:checked={showHiking}
      />
    </div>
    <div>
      <LabeledCheckbox
        name="cycling"
        icon={cyclistIcon}
        label={$_('map.trails.cycling')}
        bind:checked={showCycling}
      />
    </div>
    <span class="attribution">
      {@html $_('map.trails.attribution', {
        values: {
          link: `<a href="https://waymarkedtrails.org/" target="_blank">Waymarked Trails</a>`
        }
      })}
    </span>
  </div>

  <Filter bind:center bind:filteredGardens {fallbackLocation} />
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

  .trails {
    background-color: rgba(255, 255, 255, 0.8);
    bottom: 0;
    left: 0;
    position: absolute;
    width: 26rem;
    height: 9rem;
    padding: 1rem;
  }

  .map-section :global(.mapboxgl-ctrl-bottom-left) {
    bottom: 9rem;
  }

  .attribution {
    font-size: 1.2rem;
    margin-top: 1rem;
    display: inline-block;
  }

  .attribution :global(a) {
    text-decoration: underline;
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
    z-index: 20;
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

  .close {
    width: 3.6rem;
    height: 3.6rem;
    position: absolute;
    right: 1.2rem;
    top: 1.2rem;
    cursor: pointer;
    z-index: 10;
  }

  @media screen and (max-width: 700px) {
    .map-section {
      height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    }
    .map-section :global(.mapboxgl-ctrl-top-left) {
      top: 1rem;
    }

    .map-section :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
    }

    .vehicle-notice-wrapper {
      top: 2rem;
      left: calc(50% - 22.5rem);
    }
  }

  @media screen and (max-width: 500px) {
    .vehicle-notice-wrapper {
      width: 90%;
      left: 5%;
      height: 24rem;
    }

    .vehicle-notice {
      padding: 3rem 2rem 1rem;
    }

    .image-container {
      display: none;
    }
  }

  @media screen and (max-width: 400px) {
    .vehicle-notice-wrapper {
      height: 28rem;
    }
  }
</style>
