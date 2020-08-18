<script>
  import { _, locale } from 'svelte-i18n';
  import { onMount, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import { clickOutside } from '@/directives';
  import { goto, params } from '@sveltech/routify';
  import { getAllListedGardens } from '@/api/garden';
  import { geocodeExtensive } from '@/api/mapbox';
  import { allGardens, isFetchingGardens } from '@/stores/garden';
  import Map from '@/components/Map/Map.svelte';
  import Drawer from '@/components/Garden/Drawer.svelte';
  import GardenLayer from '@/components/Map/GardenLayer.svelte';
  import WaymarkedTrails from '@/components/Map/WaymarkedTrails.svelte';
  import routes from '@/routes';
  import { Progress, LabeledCheckbox, Icon, TextInput, Button } from '@/components/UI';
  import { getCookie, setCookie } from '@/util';
  import {
    crossIcon,
    cyclistIcon,
    hikerIcon,
    markerIcon,
    filterIcon,
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';
  import Modal from '../../components/UI/Modal.svelte';

  const fallbackLocation = { longitude: 4.5, latitude: 50.5 };
  let zoom = 7;

  $: selectedGarden = $isFetchingGardens ? null : $allGardens[$params.gardenId];

  $: console.log($allGardens);

  $: center = selectedGarden
    ? { longitude: selectedGarden.location.longitude, latitude: selectedGarden.location.latitude }
    : fallbackLocation;

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

  let locationInput = '';
  //a place format: {latitude: 51.221109, longitude: 4.3997081, place_name: "Antwerpen, Antwerpen, België"}, max 5
  let places = [];

  //if there is no text in the inputfield the places array should also be empty
  $: if (locationInput == '') emptyPlacesAndInput();

  const emptyPlacesAndInput = () => {
    places = [];
    locationInput = '';
  };

  //if locationInput changes then query
  $: getLocationWithTimeout(locationInput);

  //only query when the user stop typing for 'amount ms' of time (value between 200-1000)
  let timeout = null;
  const getLocationWithTimeout = (input) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(function () {
      getlocation(input);
    }, 250);
  };

  //if the input is valuable, query the input, biased results based on proximity paramater and locale (language)
  //if search result is successful, hide no places found warning message
  let showNoPlacesBool = false;
  const getlocation = async (string) => {
    try {
      if (string.trim() !== '') {
        const placesReturnedFromGeocode = await geocodeExtensive(
          string,
          fallbackLocation.longitude,
          fallbackLocation.latitude,
          $locale
        );
        if (placesReturnedFromGeocode.type == 'succes') {
          showNoPlacesBool = false;
          places = placesReturnedFromGeocode.data;
        } else if (placesReturnedFromGeocode.type == 'error') {
          places = [];
          showNoPlacesBool = true;
          showNoPlaces();
        }
      }
    } catch (e) {
      places = [];
      console.log(e);
    }
  };

  //display no places found warning message for 3 seconds, if there is a new warning reset the timer
  let timeoutNoPlaces = null;
  const showNoPlaces = () => {
    if (timeoutNoPlaces !== null) {
      clearTimeout(timeoutNoPlaces);
    }
    timeoutNoPlaces = setTimeout(function () {
      showNoPlacesBool = false;
    }, 3000);
  };

  //go to a place zoom in to level 11 (city) => https://wiki.openstreetmap.org/wiki/Zoom_levels
  const goToPlace = (long, lat) => {
    zoom = 11;
    center = { longitude: long, latitude: lat };
    emptyPlacesAndInput();
  };

  //if user drag map, nothing happens, if the user select a garden or click on the map the input and locations are emptied
  const handleClickOutsidePlaces = (event) => {
    const { clickEvent } = event.detail;
    emptyPlacesAndInput();
  };

  //garden filter
  let show;
  let filter;

  const facilities = [
    { name: 'water', icon: waterIcon, label: 'Water' },
    { name: 'drinkableWater', icon: waterIcon, label: 'Drinkable water' },
    { name: 'toilet', icon: toiletIcon, label: 'Toilet' },
    { name: 'bonfire', icon: bonfireIcon, label: 'Bonfire' },
    { name: 'electricity', icon: electricityIcon, label: 'Electricity' },
    { name: 'shower', icon: showerIcon, label: 'Shower' },
    { name: 'tent', icon: tentIcon, label: 'Tent' }
  ];

  const openGardenFilerModal = () => {
    show = true;
  };
</script>

<Progress active={$isFetchingGardens} />
<div class="map-section">
  <Map lon={center.longitude} lat={center.latitude} recenterOnUpdate {zoom}>
    {#if !$isFetchingGardens}
      <GardenLayer
        on:garden-click={(e) => selectGarden(e.detail)}
        selectedGardenId={selectedGarden ? selectedGarden.id : null}
        allGardens={$allGardens} />
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
          <h3>Welcome To My Garden is for slow travellers only.</h3>
          <p class="mt-m">
            If you're planning to travel by motorized vehicle, please do not contact hosts via this
            platform. Thank you for understanding!
          </p>
        </div>
      </div>
    {/if}
  </Map>

  <div class="trails">
    <div>
      <LabeledCheckbox
        name="hiking"
        icon={hikerIcon}
        label="Show hiking routes"
        bind:checked={showHiking} />
    </div>
    <div>
      <LabeledCheckbox
        name="cycling"
        icon={cyclistIcon}
        label="Show cycling routes"
        bind:checked={showCycling} />
    </div>

    <span class="attribution">
      Trails courtesy of
      <a href="https://waymarkedtrails.org/" target="_blank">Waymarked Trails</a>
    </span>
  </div>
</div>

<div class="filter">
  <div class="location-filter-column">
    <div class="location-filter-input">
      <TextInput
        icon={markerIcon}
        type="text"
        name="location-filter"
        id="location-filter"
        placeholder="Search for a city"
        hideError={true}
        bind:value={locationInput}
        autocomplete="off" />
    </div>
    {#if places.length >= 1}
      <div class="location-filter-output" in:fade={{ duration: 50 }} out:fade={{ duration: 200 }}>
        {#each places as place, i}
          <div
            on:click={goToPlace(place.longitude, place.latitude)}
            use:clickOutside
            on:click-outside={handleClickOutsidePlaces}>
            <p>{place.place_name}</p>
            <!-- <p>{place.place_name.split(',')[0]}</p> -->
          </div>
          {#if i != places.length - 1}
            <hr />
          {/if}
        {/each}
      </div>
    {:else if showNoPlacesBool}
      <div class="location-filter-output-error" transition:fade>
        <p>No places found</p>
      </div>
    {/if}
  </div>

  <div class="garden-filter">
    <Button type="button" uppercase on:click={openGardenFilerModal}>
      {@html filterIcon}
    </Button>
  </div>

</div>

<Modal bind:show maxWidth="700px" radius="true" center="true">
  <div slot="title" style="width:100%;">
    <h2 id="gardenFilterTitle">Filter</h2>
    <hr />
  </div>
  <div slot="body">

    <div id="gardenFacilities" class="gardenFilterSection">
      <h3 class="gardenFilterSubtitle">Garden Facilities</h3>
      <div class="checkboxes">
        {#each facilities as facility (facility.name)}
          <LabeledCheckbox {...facility} />
        {/each}
      </div>
    </div>
    <hr />
    <div id="gardenCapacity" class="gardenFilterSection">
      <h3 class="gardenFilterSubtitle">Garden Capacity</h3>
      <p>Tent spots available</p>
      <div class="sliders">
        <input value="1" min="1" max="20" step="1" type="range" name />
        <input value="20" min="1" max="20" step="1" type="range" />
      </div>
    </div>
    <hr />
  </div>

  <span slot="controls">
    <Button>Send</Button>
  </span>
</Modal>

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
    justify-content: flex-end;
  }

  .location-filter-column {
    align-self: stretch;
    width: 100%;
    margin-right: 1rem;
  }

  .location-filter-input {
    background-color: rgba(255, 255, 255);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 1rem;
  }

  .location-filter-output {
    background-color: rgba(255, 255, 255);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    padding: 1rem;
  }

  .location-filter-output div {
    cursor: pointer;
  }

  .location-filter-output hr {
    height: 1px;
    background-color: lightgray;
    border: none;
  }

  .location-filter-output-error {
    background-color: rgba(255, 255, 255);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    padding: 1rem;
    font-weight: bold;
    font-style: italic;
    text-align: center;
    border: 3px solid var(--color-warning);
  }

  .garden-filter :global(button) {
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
  }

  .gardenFilterSection {
    margin: 1.5rem 0;
  }

  #gardenFilterTitle {
    font-weight: bold;
  }

  .gardenFilterSubtitle {
    font-weight: 600;
    font-size: 18px;
    margin-bottom: 1rem;
  }

  .filter :global(input, .input:focus) {
    border-radius: 10px;
    border-bottom: none;
  }

  .filter :global(.button) {
    padding: 0 1.2rem;
    font-size: 1.6rem;
    height: 43px;
    margin: 0;
  }

  .attribution {
    font-size: 1.2rem;
    margin-top: 1rem;
    display: inline-block;
  }

  .attribution a {
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

  @media screen and (max-width: 400px) {
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
