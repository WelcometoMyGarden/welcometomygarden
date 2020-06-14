<script>
  import { createEventDispatcher } from 'svelte';
  import { reverseGeocode } from '@/api/mapbox';
  import { slide } from 'svelte/transition';
  import { Input } from '@/components/UI';
  import Map from '@/components/Map/Map.svelte';
  import DraggableMarker from '@/components/Map/DraggableMarker.svelte';

  const dispatch = createEventDispatcher();

  const address = {
    street: '',
    postalCode: '',
    region: '',
    country: '',
    city: ''
  };

  let coordinates = null;

  let locationConfirmed = false;
  let enteredAddress = {};
  let isAddressConfirmShown = false;
  const onMarkerDragged = async event => {
    coordinates = event.detail;
    isAddressConfirmShown = true;
    locationConfirmed = false;
    try {
      enteredAddress = { ...address, ...(await reverseGeocode(coordinates)) };
    } catch (ex) {
      // TODO: show error
      console.log(ex);
    }
  };

  const toggleLocationConfirmed = () => {
    locationConfirmed = !locationConfirmed;
    dispatch('submit', locationConfirmed ? coordinates : null);
  };
</script>

<div class="map-container">
  <Map lat="50.5" lon="4.5" zoom="6">
    {#if isAddressConfirmShown}
      <button on:click={toggleLocationConfirmed}>
        {locationConfirmed ? 'Adjust pin location' : 'Confirm pin location'}
      </button>
    {/if}
    <DraggableMarker
      label="Drag me to your garden"
      lat="50.5"
      lon="4.5"
      on:dragged={onMarkerDragged}
      filled={locationConfirmed} />
  </Map>
</div>
{#if !locationConfirmed}
  <div transition:slide>
    <div class="address-group">
      <div class="street">
        <label for="street-name">Street</label>
        <Input id="street-name" type="text" name="street-name" value={enteredAddress.street} />
      </div>
      <div>
        <label for="house-number">House number</label>
        <Input id="house-number" type="text" name="house-number" />
      </div>
    </div>

    <div class="address-group">
      <div class="province">
        <label for="postal-code">Province or State</label>
        <Input id="postal-code" type="text" name="postal-code" value={enteredAddress.region} />
      </div>
      <div>
        <label for="postal-code">Postal/ZIP Code</label>
        <Input id="postal-code" type="text" name="postal-code" value={enteredAddress.postalCode} />
      </div>
    </div>

    <div class="address-group city-country">
      <div>
        <label for="city">City</label>
        <Input id="city" type="text" name="city" value={enteredAddress.city} />
      </div>
      <div>
        <label for="country">Country</label>
        <Input id="country" type="text" name="country" value={enteredAddress.country} />
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

  .map-container button {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
  }
</style>
