<script>
  import CoordinateForm from '@/components/Garden/CoordinateForm.svelte';
  import routes from '@/routes';
  import { LabeledCheckbox } from '@/components/UI';

  import {
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';

  let garden = {
    description: '',
    facilities: {},
    capacity: 1
  };

  $: console.log(garden);

  const handleSubmit = () => {
    console.log(garden);
  };

  const setCoordinates = event => {
    garden.location = event.detail;
  };

  const facilities = [
    { name: 'water', icon: waterIcon, label: 'Water' },
    { name: 'toilet', icon: toiletIcon, label: 'Toilet' },
    { name: 'drinkable-water', icon: waterIcon, label: 'Drinkable water' },
    { name: 'bonfire', icon: bonfireIcon, label: 'Bonfire' },
    { name: 'electricity', icon: electricityIcon, label: 'Electricity' },
    { name: 'shower', icon: showerIcon, label: 'Shower' },
    { name: 'tent', icon: tentIcon, label: 'Tent' }
  ];
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
      <h3>Location *</h3>
      <p class="section-description">
        Move the marker to set the location of your garden. You can fill in the address fields to
        move the marker closer to you.
        <br />
        We don't store your address information.
      </p>
      <CoordinateForm on:submit={setCoordinates} />
    </fieldset>
  </section>

  <section>
    <fieldset>
      <h3>Describe your camping spot *</h3>
      <p class="section-description">
        A short description of your garden and the camping spot you can offer. This information is
        displayed publicly, so don't include any personal details here.
      </p>
      <div>
        <textarea
          placeholder="Enter description..."
          aria-label="description"
          id="description"
          name="description"
          required />
      </div>
    </fieldset>
  </section>

  <section>
    <fieldset>
      <h3>Facilities</h3>
      <p class="section-description">What kind of facilities do travellers have access to?</p>
      <div class="checkboxes">
        {#each facilities as facility (facility.name)}
          <LabeledCheckbox {...facility} bind:checked={garden.facilities[facility.name]} />
        {/each}
      </div>
      <div class="capacity">
        <label for="capacity">Capacity*</label>
        <p>How many tents do you have space for (estimation)</p>
        <input
          type="number"
          name="capacity"
          min="1"
          id="capacity"
          max="20"
          bind:value={garden.capacity}
          required />
      </div>
      <input type="submit" class="submit" value="Add your garden" />
    </fieldset>
  </section>

</form>

<style>
  form {
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
    box-shadow: 0px 0px 1rem rgba(0, 0, 0, 0.1);
    padding: 2rem 0;
  }

  textarea {
    width: 100%;
    height: 16rem;
    resize: vertical;
    padding: 1rem;
    border: 1px solid var(--color-gray);
    box-shadow: 0px 0px 1rem rgba(0, 0, 0, 0.1);
    transition: border 300ms ease-in-out;
  }

  textarea:focus {
    border: 1px solid var(--color-info);
  }

  fieldset,
  .sub-container {
    max-width: 60rem;
    padding: 2rem;
    margin: 0 auto;
  }

  .capacity {
    margin-top: 4rem;
  }

  .capacity p {
    margin: 1rem 0;
  }

  .capacity input {
    width: 10rem;
    margin: 1rem 0;
    display: block;
    font-size: 1.6rem;
  }

  .checkboxes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-auto-rows: min-content;
    grid-row-gap: 1rem;
  }

  .submit {
    margin-top: 4rem;
  }

  h2 {
    font-size: 2.2rem;
    font-weight: 900;
    margin-top: 2rem;
  }

  h3 {
    font-size: 1.8rem;
    font-weight: 900;
    margin: 2rem 0;
  }
</style>
