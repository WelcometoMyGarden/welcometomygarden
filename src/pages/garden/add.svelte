<script>
  import { onMount, afterUpdate } from 'svelte';
  import { slide } from 'svelte/transition';
  import { reverseGeocode } from '@/api/mapbox';
  import routes from '@/routes';
  import { Input, LabeledCheckbox, Slider } from '@/components/UI';
  import Map from '@/components/Map/Map.svelte';
  import DraggableMarker from '@/components/Map/DraggableMarker.svelte';

  import {
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';

  let garden = {};

  const handleSubmit = e => {
    console.log(e.detail);
  };

  const address = {
    street: '',
    postalCode: '',
    region: '',
    country: '',
    city: ''
  };

  let locationConfirmed = false;
  let enteredAddress = {};
  let isAddressConfirmShown = false;
  const onMarkerDragged = async event => {
    const coordinates = event.detail;
    isAddressConfirmShown = true;
    locationConfirmed = false;
    try {
      enteredAddress = { ...address, ...(await reverseGeocode(coordinates)) };
    } catch (ex) {
      // TODO: show error
      console.log(ex);
    }
  };

  let addressForm;
  let formHeight;
  onMount(() => {
    formHeight = addressForm.scrollHeight;
    console.log(formHeight);
  });
  let restoreScroll;
  const toggleLocationConfirmed = () => {
    locationConfirmed = !locationConfirmed;
    restoreScroll = locationConfirmed === true;
  };

  afterUpdate(() => {
    if (restoreScroll) window.scrollTo(0, formHeight);
    restoreScroll = false;
  });
</script>

<form on:submit|preventDefault={handleSubmit}>
  <section>
    <div class="sub-container">
      <h2>Add your garden to the map</h2>
      <p class="section-description">
        By submitting this form, your garden will be added to the map. You can manage or remove it
        at any time from
        <a href={routes.ACCOUNT}>your profile.</a>
      </p>
    </div>
  </section>
  <section>
    <fieldset>
      <h3>Location</h3>
      <p class="section-description">
        Move the marker to set the location of your garden. You can fill in the address fields to
        move the marker closer to you.
        <br />
        We don't store your address information.
      </p>
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
        <div transition:slide bind:this={addressForm}>
          <div class="address-group">
            <div class="street">
              <label for="street-name">Street</label>
              <Input
                id="street-name"
                type="text"
                name="street-name"
                value={enteredAddress.street} />
            </div>
            <div>
              <label for="house-number">House number</label>
              <Input id="house-number" type="text" name="house-number" />
            </div>
          </div>

          <div class="address-group">
            <div class="province">
              <label for="postal-code">Province or State</label>
              <Input
                id="postal-code"
                type="text"
                name="postal-code"
                value={enteredAddress.region} />
            </div>
            <div>
              <label for="postal-code">Postal/ZIP Code</label>
              <Input
                id="postal-code"
                type="text"
                name="postal-code"
                value={enteredAddress.postalCode} />
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
    </fieldset>
  </section>

  <section>
    <fieldset>
      <h3>Describe your camping spot</h3>
      <p class="section-description">
        A short description of your garden and the camping spot you can offer. This information is
        displayed publicly, so don't include any personal details here.
      </p>
      <div>
        <label for="description">Description</label>
        <textarea id="description" name="description" required />
      </div>
    </fieldset>
  </section>

  <div class="section-wrapper">
    <fieldset>
      <h3>Facilities</h3>
      <div class="checkboxes">
        <LabeledCheckbox name="toilet" icon={toiletIcon} label="Toilet" />
        <LabeledCheckbox name="water" icon={waterIcon} label="Water" />
        <LabeledCheckbox name="drinkable-water" icon={waterIcon} label="Drinkable water" />
        <LabeledCheckbox name="bonfire" icon={bonfireIcon} label="Bonfire" />
        <LabeledCheckbox name="electricity" icon={electricityIcon} label="Electricity" />
        <LabeledCheckbox name="shower" icon={showerIcon} label="Shower" />
        <LabeledCheckbox name="tent" icon={tentIcon} label="Tent" />
      </div>
      <div class="capacity">
        <Slider name="capacity" required min={1} max={20} />
      </div>
      <input type="submit" value="Add your garden" />
    </fieldset>
  </div>

</form>

<style>
  form {
    width: 100%;
  }

  form :global(input:not([type='checkbox'])) {
    width: 100%;
  }

  .section-description {
    margin: 2rem 0;
  }

  .section-description a {
    color: var(--color-orange);
  }

  section {
    width: 100%;
    margin-bottom: 2rem;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  fieldset,
  .sub-container {
    max-width: 60rem;
    padding: 2rem;
    margin: 0 auto;
  }

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
  }

  .map-container button {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
  }

  .checkboxes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: min-content;
    grid-row-gap: 1rem;
  }

  h2 {
    font-size: 2.2rem;
    font-weight: 900;
    margin-top: 4rem;
  }

  h3 {
    font-size: 1.8rem;
    font-weight: 900;
    margin: 2rem 0;
  }
</style>
