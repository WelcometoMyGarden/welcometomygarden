<script>
  import { createEventDispatcher } from 'svelte';
  import { reverseGeocode, geocode } from '@/api/mapbox';
  import { slide } from 'svelte/transition';
  import { TextInput, Button } from '@/components/UI';
  import Map from '@/components/Map/Map.svelte';
  import DraggableMarker from '@/components/Map/DraggableMarker.svelte';

  const dispatch = createEventDispatcher();

  const defaultAddressValues = {
    street: '',
    postalCode: '',
    region: '',
    country: '',
    city: ''
  };

  let coordinates = {
    latitude: 50.5,
    longitude: 4.5
  };

  let address = {};
  let reverseGeocoded = false;
  let locationConfirmed = false;
  let isAddressConfirmShown = false;

  const setAddressField = async event => {
    if (reverseGeocoded) {
      address = { ...defaultAddressValues };
      reverseGeocoded = false;
    }
    address[event.target.name] = event.target.value;
    const addressString = Object.keys(address)
      .map(key => address[key])
      .filter(v => v)
      .join(' ');
    try {
      coordinates = await geocode(addressString);
    } catch (ex) {
      console.log(ex);
    }
    dispatch('confirm', locationConfirmed ? coordinates : null);
  };

  const onMarkerDragged = async event => {
    coordinates = event.detail;
    isAddressConfirmShown = true;
    locationConfirmed = false;
    try {
      address = { ...defaultAddressValues, ...(await reverseGeocode(coordinates)) };
      reverseGeocoded = true;
    } catch (ex) {
      console.log(ex);
    }
  };

  const toggleLocationConfirmed = () => {
    locationConfirmed = !locationConfirmed;
    dispatch('confirm', locationConfirmed ? coordinates : null);
  };
</script>

<div class="map-container">
  <Map lat={coordinates.latitude} lon={coordinates.longitude} recenterOnUpdate={true} zoom="6">
    {#if isAddressConfirmShown}
      <Button type="button" small inverse={locationConfirmed} on:click={toggleLocationConfirmed}>
        {locationConfirmed ? 'Adjust pin location' : 'Confirm pin location'}
      </Button>
    {/if}
    <DraggableMarker
      label="Drag me to your garden"
      lat={coordinates.latitude}
      lon={coordinates.longitude}
      on:dragged={onMarkerDragged}
      filled={locationConfirmed} />
  </Map>
</div>
{#if !locationConfirmed}
  <div transition:slide>
    <div class="address-group">
      <div class="street">
        <label for="street-name">Street</label>
        <TextInput
          id="street-name"
          type="text"
          name="street"
          on:blur={setAddressField}
          value={address.street} />
      </div>
      <div>
        <label for="house-number">House number</label>
        <TextInput id="house-number" type="text" name="house-number" on:blur={setAddressField} />
      </div>
    </div>

    <div class="address-group">
      <div class="province">
        <label for="region">Province or State</label>
        <TextInput
          id="region"
          type="text"
          name="region"
          value={address.region}
          on:blur={setAddressField} />
      </div>
      <div>
        <label for="postal-code">Postal/ZIP Code</label>
        <TextInput
          id="postal-code"
          type="text"
          name="postalCode"
          value={address.postalCode}
          on:blur={setAddressField} />
      </div>
    </div>

    <div class="address-group city-country">
      <div>
        <label for="city">City</label>
        <TextInput
          id="city"
          type="text"
          name="city"
          value={address.city}
          on:blur={setAddressField} />
      </div>
      <div>
        <label for="country">Country</label>
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
  }
</style>
