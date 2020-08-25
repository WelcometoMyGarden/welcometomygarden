<script>
  import { locale } from 'svelte-i18n';
  import { geocodeExtensive } from '@/api/mapbox';
  import { clickOutside } from '@/directives';
  import { TextInput } from '@/components/UI';
  import { markerIcon } from '@/images/icons';

  export let zoom;
  export let center;
  export let isSearching;
  export let fallbackLocation;

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

  //only query when the user stop typing for 'amount ms' of time (value between 200-1000 recommended)
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
          $locale,
          5
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

  const displayPlaceName = (place_name) => {
    const placeParts = place_name.split(',');
    let placeFormat = '';
    for (let index = 0; index < placeParts.length - 1; index++) {
      if (index == placeParts.length - 2) {
        placeFormat += placeParts[index];
      } else {
        placeFormat += placeParts[index] + ', ';
      }
    }
    return placeFormat;
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
  const handleClickOutsidePlaces = () => {
    emptyPlacesAndInput();
  };

  $: isSearching = !!places.length || showNoPlacesBool;
</script>

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
  <div class="location-filter-output" use:clickOutside on:click-outside={handleClickOutsidePlaces}>
    {#each places as place, i}
      <button
        class="button-container"
        on:click={goToPlace(place.longitude, place.latitude)}
        tabindex="0">
        {displayPlaceName(place.place_name)}
      </button>
      {#if i != places.length - 1}
        <hr />
      {/if}
    {/each}
  </div>
{:else if showNoPlacesBool}
  <div class="location-filter-output-error">
    <p>No places found</p>
  </div>
{/if}

<style>
  .location-filter-input {
    background-color: var(--color-white);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 1rem;
  }

  .location-filter-output {
    background-color: var(--color-white);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    padding: 1rem;
  }

  .location-filter-output hr {
    height: 1px;
    background-color: lightgray;
    border: none;
  }

  .location-filter-output-error {
    background-color: var(--color-white);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    padding: 1rem;
    font-weight: bold;
    font-style: italic;
    text-align: center;
    border: 3px solid var(--color-warning);
  }

  .button-container:focus {
    text-decoration: underline;
  }
</style>
