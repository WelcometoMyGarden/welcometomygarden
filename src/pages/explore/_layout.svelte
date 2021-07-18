<script>
  import { _ } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { goto, params } from '@sveltech/routify';
  import { getAllListedGardens } from '@/api/garden';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import Drawer from '@/components/Garden/Drawer.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '@/components/Map/WaymarkedTrails.svelte';
  import routes from '@/routes';
  import { Progress, LabeledCheckbox, Icon, Button, Tag } from '@/components/UI';
  import Filter from '@/components/Garden/Filter.svelte';
  import FilterLocation from '@/components/Garden/FilterLocation.svelte';
  import { getCookie, setCookie } from '@/util';
  import { user } from '@/stores/auth';
  import { geocodeCountryCode } from '@/api/mapbox';
  import { getLocationFromIp } from '@/api/geolocation';
  import {
    crossIcon,
    cyclistIcon,
    hikerIcon,
    filterIcon,
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';

  let initialLocation;
  const userLocation = async () => {
    if ($user && $user.garden) {
      return {
        longitude: $user.garden.location.longitude,
        latitude: $user.garden.location.latitude
      };
    }
    let responseLocationFromIP = await getLocationFromIp();
    if (responseLocationFromIP) {
      return {
        longitude: responseLocationFromIP.longitude,
        latitude: responseLocationFromIP.latitude
      };
    }
    if ($user && $user.countryCode) {
      let response = await geocodeCountryCode($user.countryCode);
      //{longitude: 4.63357500000001, latitude: 50.438696, place_name: "Belgium"}
      if (response) {
        return {
          longitude: response.longitude,
          latitude: response.latitude
        };
      }
    }
    // initialLocation = { longitude: 4.5, latitude: 50.5 };
  };

  let zoom = 7;

  let filteredGardens = null;
  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$params.gardenId];

  $: center = selectedGarden
    ? { longitude: selectedGarden.location.longitude, latitude: selectedGarden.location.latitude }
    : initialLocation;

  let carNoticeShown = !getCookie('car-notice-dismissed');

  const selectGarden = (garden) => {
    const newSelectedId = garden.id;
    const newGarden = $allGardens[newSelectedId];
    center = { longitude: newGarden.location.longitude, latitude: newGarden.location.latitude };
    $goto(`${routes.MAP}/garden/${newSelectedId}`);
  };

  const closeDrawer = () => {
    $goto(routes.MAP);
  };

  onMount(async () => {
    const location = await userLocation();
    location
      ? (initialLocation = location)
      : (initialLocation = { longitude: 4.5, latitude: 50.5 });

    if (Object.keys($allGardens).length === 0) {
      try {
        await getAllListedGardens();
      } catch (ex) {
        console.log(ex);
        isFetchingGardens.set(false);
      }
    }
  });

  const closeCarNotice = () => {
    const date = new Date();
    // one year
    date.setTime(date.getTime() + 365 * 86400000); //24 * 60 * 60 * 1000
    setCookie('car-notice-dismissed', true, { expires: date.toGMTString() });
    carNoticeShown = false;
  };

  onDestroy(() => {
    isFetchingGardens.set(false);
  });

  let showHiking = false;

  let showCycling = false;

  let showFilterModal = false;

  let isSearching = false;

  let filter = {
    facilities: {},
    capacity: {
      min: 1,
      max: 20
    }
  };

  const facilities = [
    { name: 'toilet', icon: toiletIcon, label: 'Toilet' },
    { name: 'shower', icon: showerIcon, label: 'Shower' },
    { name: 'electricity', icon: electricityIcon, label: 'Electricity' },
    { name: 'tent', icon: tentIcon, label: 'Tent' },
    { name: 'bonfire', icon: bonfireIcon, label: 'Bonfire' },
    { name: 'water', icon: waterIcon, label: 'Water' },
    { name: 'drinkableWater', icon: waterIcon, label: 'Drinkable water' }
  ];

  let maxWidth = 500;
  let vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  let allFiltersTag = false;
  const activeFacilities = () => {
    let activeFacilitiesFiltered = facilities.filter(
      (facility) => filter.facilities[facility.name] === true
    );

    if (maxWidth && vw < maxWidth) {
      if (activeFacilitiesFiltered.length > 3) {
        activeFacilitiesFiltered = activeFacilitiesFiltered.slice(0, 3);
        allFiltersTag = true;
      } else {
        allFiltersTag = false;
      }
    } else {
      allFiltersTag = false;
    }
    return activeFacilitiesFiltered;
  };
  const attributionLinkTrails = `<a href="https://waymarkedtrails.org/" target="_blank">Waymarked Trails</a>`;
</script>

<Progress active={$isFetchingGardens} />

<div class="map-section">
  {#if initialLocation}
    <Map lon={center.longitude} lat={center.latitude} recenterOnUpdate {zoom}>
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
    </Map>
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
      {@html $_('map.trails.attribution', { values: { link: attributionLinkTrails } })}
    </span>
  </div>

  <div class="filter">
    <div class="location-filter">
      <FilterLocation bind:zoom bind:center bind:isSearching fallbackLocation={initialLocation} />
    </div>
    <div class="garden-filter">
      <Button
        type="button"
        uppercase
        on:click={() => {
          showFilterModal = true;
        }}
      >
        {@html filterIcon}
      </Button>
    </div>
    {#if !isSearching}
      <div class="filter-tags">
        {#each activeFacilities() as facility (facility.name)}
          <Tag
            name={facility.name}
            icon={facility.icon}
            label={facility.label}
            on:close={() => (filter.facilities[facility.name] = false)}
          />
        {/each}
        {#if allFiltersTag}
          <Tag
            name="all-filters"
            label="all filters"
            on:click={() => {
              showFilterModal = true;
            }}
            closeButton={false}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

<Filter
  bind:show={showFilterModal}
  allGardens={$allGardens}
  bind:filteredGardens
  {facilities}
  bind:filter
/>

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

  .filter {
    background-color: rgba(255, 255, 255, 0);
    width: 80%;
    top: calc(var(--height-nav) + 3rem);
    width: 32rem;
    left: 6rem;
    position: absolute;
    display: flex;
    flex-wrap: wrap;
  }

  .location-filter {
    width: calc(100% - 60px);
    margin-right: 1rem;
  }

  .filter-tags {
    padding: 0;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .filter :global(input, .input:focus) {
    border-radius: 10px;
    border-bottom: none;
  }

  .garden-filter :global(button) {
    padding: 0 1.2rem;
    font-size: 1.6rem;
    height: 43px;
    margin: 0;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
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
      height: 28rem;
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

  @media screen and (max-width: 700px) {
    .map-section {
      height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    }
    .map-section :global(.mapboxgl-ctrl-top-left) {
      top: calc(var(--height-nav) + 0.5rem);
    }

    .map-section :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
    }

    .vehicle-notice-wrapper {
      top: 2rem;
      left: 50%;
      transform: translateX(-50%);
    }

    .filter {
      top: 3rem;
      width: 72%;
      left: 50%;
      transform: translateX(-50%);
    }
  }
</style>
