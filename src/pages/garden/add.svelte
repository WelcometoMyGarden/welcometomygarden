<script>
  import { Input, LabeledCheckbox, Slider } from '@/components/UI';
  import Map from '@/components/Map/Map.svelte';
  import DraggableMarker from '@/components/Map/DraggableMarker.svelte';
  import routes from '@/routes';

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

  const onMarkerDragged = event => {
    console.log(event.detail);
  };
</script>

<form on:submit|preventDefault={handleSubmit}>
  <section>
    <div class="sub-container">
      <h2>Add your garden to the map</h2>
      <p class="section-description">
        By submitting this form, your garden will be added to the map. You can manage or remove it
        at any time from
        <a href={routes}>your profile.</a>
      </p>
    </div>
  </section>
  <section>
    <fieldset>
      <h3>Location</h3>
      <p class="section-description">
        We don't store your address, and you don't have to fill it in. By filling in the fields we
        can help you put the .
      </p>
      <div class="map-container">
        <Map lat="50.5" lon="4.5" zoom="6">
          <DraggableMarker
            label="Drag me to your garden"
            lat="50.5"
            lon="4.5"
            on:dragged={onMarkerDragged} />
        </Map>
      </div>
      <div class="address-group">
        <div class="street">
          <label for="street-name">Street</label>
          <Input id="street-name" type="text" name="street-name" />
        </div>
        <div>
          <label for="house-number">House number</label>
          <Input id="house-number" type="text" name="house-number" />
        </div>
      </div>

      <div class="address-group">
        <div class="province">
          <label for="postal-code">Province or State</label>
          <Input id="postal-code" type="text" name="postal-code" />
        </div>
        <div>
          <label for="postal-code">Postal/ZIP Code</label>
          <Input id="postal-code" type="text" name="postal-code" />
        </div>
      </div>

      <div class="address-group city-country">
        <div>
          <label for="city">City</label>
          <Input id="city" type="text" name="city" />
        </div>
        <div>
          <label for="country">Country</label>
          <Input id="country" type="text" name="country" />
        </div>
      </div>
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
