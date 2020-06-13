<script>
  import { Input, LabeledCheckbox, Slider } from '@/components/UI';
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
</script>

<form on:submit|preventDefault={handleSubmit}>
  <div class="section-wrapper">
    <fieldset>
      <h2>Add your garden to the map</h2>
      <div>
        <label for="street-name">Street</label>
        <Input id="street-name" type="text" name="street-name" />
      </div>
      <div>
        <label for="house-number">House number</label>
        <Input id="house-number" type="text" name="house-number" />
      </div>
      <div>
        <label for="postal-code">Postal code or ZIP Code</label>
        <Input id="postal-code" type="text" name="postal-code" />
      </div>
      <div>
        <label for="postal-code">Province or State</label>
        <Input id="postal-code" type="text" name="postal-code" />
      </div>
      <div>
        <label for="city">City</label>
        <Input id="city" type="text" name="city" />
      </div>
      <div>
        <label for="country">Country</label>
        <Input id="country" type="text" name="country" />
      </div>
    </fieldset>
  </div>

  <div class="section-wrapper">
    <fieldset>
      <div>
        <label for="description">Description</label>
        <textarea id="description" name="description" required />
        <span class="hint">
          A short description of your garden and the camping spot you can offer. This information is
          displayed publicly, so don't include any personal details here.
        </span>
      </div>
    </fieldset>
  </div>

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

  .section-wrapper {
    width: 100%;
    margin-bottom: 2rem;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  fieldset {
    max-width: 60rem;
    padding: 2rem;
    margin: 0 auto;
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
    margin-bottom: 3rem;
  }

  h3 {
    margin-bottom: 2rem;
  }
</style>
