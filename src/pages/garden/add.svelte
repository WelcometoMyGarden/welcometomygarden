<script>
  import { slide } from 'svelte/transition';
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

  let formValid = true;
  let garden = {
    description: '',
    facilities: {},
    capacity: 1,
    location: null,
    photo: {
      files: null,
      data: null
    }
  };

  let descriptionHint = { message: '', valid: true };
  const validateDescription = description => {
    const len = description.length;
    if (len < 20) {
      descriptionHint.valid = false;
      const plurality = 20 - len === 1 ? 'character' : 'characters';
      descriptionHint.message = `${20 - len} more ${plurality} required...`;
      return false;
    }
    if (len > 300) {
      descriptionHint.valid = false;
      const plurality = len - 300 === 1 ? 'character' : 'characters';
      descriptionHint.message = `${len - 300} ${plurality} too long`;
      return false;
    }
    descriptionHint.valid = true;
    descriptionHint.message = '';
    return true;
  };

  const updateDescription = event => {
    const description = event.target.value;
    validateDescription(description);
    garden.description = description;
  };

  let coordinateHint = { message: '', valid: true };
  const validateLocation = location => {
    if (!location) {
      coordinateHint.message =
        'Make sure you have dragged the map marker to the exact location of your garden, and have clicked "Confirm pin location"';
      coordinateHint.valid = false;
      return false;
    }
    coordinateHint.valid = true;
    return true;
  };
  const setCoordinates = event => {
    garden.location = event.detail;
  };

  const validFileTypes = ['image/jpeg', 'image/png', 'image/tiff'];
  let photoHint = { message: '', valid: true };
  const validatePhoto = file => {
    if (!validFileTypes.includes(file.type)) {
      photoHint.message = 'Your photo must be a JPEG, PNG, or TIFF file';
      photoHint.valid = false;
      return false;
    }
    // Should be no bigger than 5MB
    if (file.size / 1024 / 1024 > 5) {
      photoHint.message = "Your image is too large. An image's file size should be 5MB or smaller";
      photoHint.valid = false;
      return false;
    }
    return true;
  };

  const choosePhoto = () => {
    if (!garden.photo.files) return;

    const file = garden.photo.files[0];
    if (!validatePhoto(file)) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = e => {
      garden.photo.data = e.target.result;
    };
  };

  $: console.log(garden);
  const handleSubmit = () => {
    if (
      [validateDescription(garden.description), validateLocation(garden.location)].includes(false)
    ) {
      formValid = false;
    } else if (garden.photo.files && !validatePhoto(garden.photo.files[0])) {
      formValid = false;
    } else {
      formValid = true;
    }
  };

  const facilities = [
    { name: 'water', icon: waterIcon, label: 'Water' },
    { name: 'drinkable-water', icon: waterIcon, label: 'Drinkable water' },
    { name: 'toilet', icon: toiletIcon, label: 'Toilet' },
    { name: 'bonfire', icon: bonfireIcon, label: 'Bonfire' },
    { name: 'electricity', icon: electricityIcon, label: 'Electricity' },
    { name: 'shower', icon: showerIcon, label: 'Shower' },
    { name: 'tent', icon: tentIcon, label: 'Tent' }
  ];
</script>

<form>
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
      <h3>Location (required)</h3>
      <p class="section-description">
        Move the marker to set the location of your garden. You can fill in the address fields to
        move the marker closer to you.
        <br />
        We don't store your address information.
      </p>
      <CoordinateForm on:confirm={setCoordinates} />
      <p class="hint" class:invalid={!coordinateHint.valid}>{coordinateHint.message}</p>
    </fieldset>
  </section>

  <section>
    <fieldset>
      <h3>Describe your camping spot (required)</h3>
      <p class="section-description">
        A short description of your garden and the camping spot you can offer. This information is
        displayed publicly, so don't include any personal details here.
        <br />
        Your description must be between 20 and 300 characters.
      </p>
      <div>
        <textarea
          placeholder="Enter description..."
          aria-label="description"
          id="description"
          name="description"
          value={garden.description}
          on:input={updateDescription} />
        <p class="hint" class:invalid={!descriptionHint.valid}>{descriptionHint.message}</p>
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
    </fieldset>
  </section>
  <section>
    <fieldset>
      <h3>Photo</h3>
      <p class="section-description">
        Show people what your garden looks like.
        <br />
        Make sure that the picture only shows the camp spot and doesn't include your neighbour's
        home.
      </p>

      <input
        type="file"
        id="photo"
        name="photo"
        bind:files={garden.photo.files}
        on:change={choosePhoto}
        multiple={false}
        accept={validFileTypes.join(',')} />

      {#if garden.photo.data}
        <div class="photo" transition:slide>
          <img src={garden.photo.data} alt="Your garden" />
        </div>
      {/if}

      <p class="hint" class:invalid={!photoHint.valid}>{photoHint.message}</p>
    </fieldset>
  </section>
  <section class="section-submit">
    <div class="sub-container">
      <button type="button" on:click={handleSubmit}>Add your garden</button>
      {#if !formValid}
        <p class="hint invalid" transition:slide>
          Some information was not valid. Please check your submitted information for errors.
        </p>
      {/if}
    </div>
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
    text-decoration: underline;
  }

  section {
    width: 100%;
    margin-bottom: 2rem;
    box-shadow: 0px 0px 1rem rgba(0, 0, 0, 0.1);
  }

  .section-submit {
    margin-bottom: 0;
    text-align: center;
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
    width: 90%;
    margin: 0 auto;
    padding: 3rem;
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

  @media screen and (max-width: 600px) {
    .checkboxes {
      grid-template-columns: 1fr;
    }
  }

  h2 {
    font-size: 2.2rem;
    font-weight: 900;
    margin-top: 2rem;
  }

  h3 {
    font-size: 1.8rem;
    font-weight: 900;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .hint {
    margin: 1rem 0;
    font-size: 1.4rem;
    min-height: 2rem;
    width: 100%;
  }

  .hint.invalid {
    color: var(--color-orange);
  }

  .photo {
    margin: 2rem 0;
    width: 100%;
    height: auto;
  }

  .photo img {
    max-width: 100%;
    max-height: 100%;
  }
</style>
