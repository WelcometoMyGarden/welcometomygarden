<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { reverseGeocode, geocode, type Address } from '$lib/api/mapbox';
  import { slide } from 'svelte/transition';
  import { TextInput, Button } from '$lib/components/UI';
  import Map from '$lib/components/Map/Map.svelte';
  import DraggableMarker from '$lib/components/Map/DraggableMarker.svelte';
  import { LOCATION_BELGIUM, ZOOM_LEVELS } from '$lib/constants';
  import type { LongLat } from '$lib/types/Garden';
  import * as Sentry from '@sentry/sveltekit';
  import logger from '$lib/util/logger';
  interface Props {
    /**
     * Should be supplied if the location of the garden is already set and known.
     */
    initialCoordinates?: LongLat | null;
    onconfirm: (event: LongLat | null) => void;
  }

  let { initialCoordinates = null, onconfirm }: Props = $props();

  const defaultAddressValues: Address = {
    street: '',
    postalCode: '',
    region: '',
    country: '',
    city: '',
    houseNumber: ''
  };

  // TODO: if we can, we should use geolocation here to help the host
  let coordinates = $state(initialCoordinates || LOCATION_BELGIUM);
  let address: Partial<Address> = $state({});

  // Auto-confirm when initial coordinates are already known,
  // to be used when editing a garden which already has an
  // initial position
  let locationConfirmed = $state(!!initialCoordinates);
  // Initial value:
  // - with initial coords given, we want to show the "change" button
  // - without initial coords, we wait until a drag happens to show the button
  let showAddrConfirmOrChangeButton = $state(!!initialCoordinates);

  $inspect('initcoord', initialCoordinates);

  // Initial values
  let zoom = $state(ZOOM_LEVELS.WESTERN_EUROPE);
  // Whether to adjust zoom when the marker coordinates changes
  let applyZoom = $state(false);

  /**
   * Called when one of the address fields is defocussed (blurred).
   */
  const setAddressField = async (event: FocusEvent) => {
    let target = event.target as unknown as TextInput;
    if (!target?.name) {
      // Shouldn't happen
      return;
    }
    // Update the address
    address[target.name as keyof Address] = target.value;
    const { street, postalCode, region, country, city, houseNumber } = address;
    // Combine the address into a string for querying
    // https://docs.mapbox.com/help/troubleshooting/address-geocoding-format-guide/#addresses-in-multiple-countries
    // -> most granular to least granular, space-separated
    const addressString = [houseNumber, street, postalCode, city, region, country]
      .filter((v) => v != null && v !== '')
      .join(' ');

    try {
      coordinates = await geocode(addressString);
      // Fly to the filled in address
      // Between road & building
      zoom = 16;
      applyZoom = true;
      showAddrConfirmOrChangeButton = true;
    } catch (ex) {
      Sentry.captureException(ex, {
        extra: { context: `Geocoding an address (len ${addressString.length})` }
      });
      logger.warn(ex);
    }
    onconfirm(locationConfirmed ? coordinates : null);
  };

  const onMarkerDragged = async (event: LongLat) => {
    // Don't readjust zoom after the user adjusted the marker
    applyZoom = false;
    coordinates = event;
    showAddrConfirmOrChangeButton = true;
    locationConfirmed = false;
    try {
      address = { ...defaultAddressValues, ...(await reverseGeocode(coordinates)) };
    } catch (ex) {
      Sentry.captureException(ex, { extra: { context: 'Reverse-geocoding an address' } });
      logger.warn(ex);
    }
  };

  const toggleLocationConfirmed = () => {
    locationConfirmed = !locationConfirmed;
    onconfirm(locationConfirmed ? coordinates : null);
  };
</script>

<div class="map-container">
  <Map
    lat={coordinates.latitude}
    lon={coordinates.longitude}
    {zoom}
    {applyZoom}
    maxZoom={ZOOM_LEVELS.BUILDING}
    recenterOnUpdate={true}
    enableGeolocation={false}
  >
    {#if showAddrConfirmOrChangeButton}
      <Button type="button" small inverse={locationConfirmed} onclick={toggleLocationConfirmed}>
        {#if locationConfirmed}
          {$_('garden.form.location.adjust-button')}
        {:else}{$_('garden.form.location.confirm-button')}{/if}
      </Button>
    {/if}
    <DraggableMarker
      label="Drag me to your garden"
      lat={coordinates.latitude}
      lon={coordinates.longitude}
      ondragged={onMarkerDragged}
      filled={locationConfirmed}
    />
  </Map>
</div>
{#if !locationConfirmed}
  <div transition:slide>
    <div class="address-group">
      <div class="street">
        <label for="street-name">{$_('garden.form.location.street')}</label>
        <TextInput
          id="street-name"
          type="text"
          name="street"
          onblur={setAddressField}
          value={address.street}
        />
      </div>
      <div>
        <label for="house-number">{$_('garden.form.location.house-number')}</label>
        <TextInput
          id="house-number"
          type="text"
          name="houseNumber"
          onblur={setAddressField}
          value={address.houseNumber}
        />
      </div>
    </div>

    <div class="address-group">
      <div class="province">
        <label for="region">{$_('garden.form.location.region')}</label>
        <TextInput
          id="region"
          type="text"
          name="region"
          value={address.region}
          onblur={setAddressField}
        />
      </div>
      <div>
        <label for="postal-code">{$_('garden.form.location.postal-code')}</label>
        <TextInput
          id="postal-code"
          type="text"
          name="postalCode"
          value={address.postalCode}
          onblur={setAddressField}
        />
      </div>
    </div>

    <div class="address-group city-country">
      <div>
        <label for="city">{$_('garden.form.location.city')}</label>
        <TextInput
          id="city"
          type="text"
          name="city"
          value={address.city}
          onblur={setAddressField}
        />
      </div>
      <div>
        <label for="country">{$_('garden.form.location.country')}</label>
        <TextInput id="country" type="text" name="country" value={address.country} />
      </div>
    </div>
  </div>
{/if}

<style>
  .address-group {
    display: flex;
    justify-content: space-between;
    margin-bottom: 1.2rem;
  }

  .street,
  .province {
    width: 80%;
    margin-right: 2rem;
  }

  .city-country > div {
    width: 48%;
  }

  .map-container {
    width: 100%;
    height: 40rem;
    margin: 2rem 0;
    position: relative;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  .map-container :global(.button) {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    z-index: 1;
  }

  .map-container :global(.mapboxgl-ctrl-bottom-left) {
    bottom: 5rem;
  }

  @media screen and (max-width: 700px) {
    .map-container :global(.mapboxgl-ctrl-bottom-right) {
      top: 0;
      right: 0;
    }
  }
</style>
