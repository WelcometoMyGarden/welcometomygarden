<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { geocodeExtensive } from '$lib/api/mapbox';
  import { clickOutside } from '$lib/attachments';
  import { TextInput } from '$lib/components/UI';
  import { markerIcon } from '$lib/images/icons';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { coercedLocale } from '$lib/stores/app';
  import * as Sentry from '@sentry/sveltekit';
  import type { LongLat } from '$lib/types/Garden';
  import { debounce } from 'lodash-es';
  import logger from '$lib/util/logger';

  let {
    isSearching = $bindable(),
    closeToLocation,
    onGoToPlace
  }: {
    /**
     * Whether the user is using this feature (not whether the search request is ongoing)
     */
    isSearching: boolean;
    closeToLocation: LongLat;
    onGoToPlace: (ll: LongLat) => void;
  } = $props();

  let locationInput = $state('');

  /**
   * Max length: 5
   */
  let places = $state<(LongLat & { place_name: string })[]>([]);

  const clearPlacesAndInput = () => {
    places = [];
    locationInput = '';
  };

  // Display the "no places found" warning message for 3 seconds,
  // if there is a new warning reset the timer
  let timeoutNoPlaces: number | null = null;
  const showNoPlaces = () => {
    if (timeoutNoPlaces !== null) {
      clearTimeout(timeoutNoPlaces);
    }
    timeoutNoPlaces = window.setTimeout(function () {
      showNoPlacesBool = false;
    }, 3000);
  };

  // if the input is valuable, query the input, biased results based on proximity paramater and locale (language)
  // if search result is successful, hide no places found warning message
  let showNoPlacesBool = $state(false);

  /**
   *
   * @param str
   */
  const _forwardGeocode = async (str: string) => {
    try {
      if (str.trim() !== '') {
        const placesReturnedFromGeocode = await geocodeExtensive(
          str,
          closeToLocation.longitude,
          closeToLocation.latitude,
          $coercedLocale,
          5
        );
        if (placesReturnedFromGeocode.type == 'succes') {
          showNoPlacesBool = false;
          places = placesReturnedFromGeocode.data ?? [];
        } else if (placesReturnedFromGeocode.type == 'error') {
          places = [];
          showNoPlacesBool = true;
          showNoPlaces();
        }
      }
    } catch (err) {
      places = [];
      logger.error(err);
      Sentry.captureException(err, { extra: { context: 'Extensive-geocoding' } });
    }
  };

  const debouncedForwardGeocode = debounce(_forwardGeocode, 250);

  const displayPlaceName = (place_name: string) => {
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

  const goToPlace = (long: number, lat: number) => {
    clearPlacesAndInput();
    onGoToPlace({ longitude: long, latitude: lat });
  };

  // If user drag map, nothing happens, if the user select a garden or click on the map the input and locations are emptied
  const handleClickOutsidePlaces = () => {
    clearPlacesAndInput();
  };

  $effect(() => {
    // Clear the places if the input is empty
    if (locationInput?.trim() === '' && places.length > 0) {
      places = [];
    }

    /// If the input changes, do a location lookup
    debouncedForwardGeocode(locationInput);

    // Note: what this achieves is communicating whether there
    // were some results, or no results, to the parent component
    // Which can then hide some components under the result list
    // TODO: not sure if this is really necessary.
    isSearching = places.length > 0 || showNoPlacesBool;
  });
</script>

<div class="location-filter-input">
  <TextInput
    icon={markerIcon}
    type="text"
    name="location-filter"
    id="location-filter"
    placeholder={$_('garden.filter.search-city')}
    hideError={true}
    bind:value={locationInput}
    autocomplete="off"
  />
</div>
{#if places.length >= 1}
  <div
    class="location-filter-output"
    {@attach clickOutside}
    onclickoutside={handleClickOutsidePlaces}
  >
    {#each places as place, i}
      <button
        class="button-container"
        onclick={() => {
          goToPlace(place.longitude, place.latitude);
          trackEvent(PlausibleEvent.VISIT_SEARCHED_LOCATION);
        }}
        tabindex="0"
      >
        {displayPlaceName(place.place_name)}
      </button>
      {#if i != places.length - 1}
        <hr />
      {/if}
    {/each}
  </div>
{:else if showNoPlacesBool}
  <div class="location-filter-output-error">
    <p>{$_('garden.filter.no-places')}</p>
  </div>
{/if}

<style>
  .location-filter-input {
    background-color: var(--color-white);
    border-radius: 10px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.05);
    margin-bottom: 1rem;
    padding-left: 1rem;
  }

  .location-filter-output {
    width: 100%;
    position: absolute;
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
