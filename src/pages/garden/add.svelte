<script>
  import { goto } from '@sveltech/routify';
  import { slide } from 'svelte/transition';
  import notify from '@/stores/notification';
  import { addGarden } from '@/api/garden';
  import CoordinateForm from '@/components/Garden/CoordinateForm.svelte';
  import routes from '@/routes';
  import { user } from '@/stores/auth';
  import { LabeledCheckbox, Button, Progress } from '@/components/UI';

  import {
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';

  let isFillable = $user && $user.emailVerified;

  let formValid = true;
  let garden = {
    description: '',
    location: null,
    facilities: {
      capacity: 1
    },
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
    coordinateHint.message = '';
    coordinateHint.valid = true;
    return true;
  };
  const setCoordinates = event => {
    validateLocation(event.detail);
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
    photoHint.message = '';
    photoHint.valid = true;
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

  let addingGarden = false;
  const handleSubmit = async () => {
    if (!isFillable) return;
    if (
      [validateDescription(garden.description), validateLocation(garden.location)].includes(false)
    ) {
      formValid = false;
      return;
    }
    if (garden.photo.files && !validatePhoto(garden.photo.files[0])) {
      formValid = false;
      return;
    }

    formValid = true;
    addingGarden = true;
    try {
      await addGarden({ ...garden, photo: garden.photo.files ? garden.photo.files[0] : null });
      // TODO: refetch gardens and route to newly created garden
      notify.success(
        `Your garden was added successfully! It may take a minute for its photo to show up.`,
        10000
      );
      $goto(`${routes.MAP}/garden/${$user.id}`);
    } catch (ex) {
      console.log(ex);
    }
    addingGarden = false;
  };

  const facilities = [
    { name: 'water', icon: waterIcon, label: 'Water' },
    { name: 'drinkableWater', icon: waterIcon, label: 'Drinkable water' },
    { name: 'toilet', icon: toiletIcon, label: 'Toilet' },
    { name: 'bonfire', icon: bonfireIcon, label: 'Bonfire' },
    { name: 'electricity', icon: electricityIcon, label: 'Electricity' },
    { name: 'shower', icon: showerIcon, label: 'Shower' },
    { name: 'tent', icon: tentIcon, label: 'Tent' }
  ];
</script>

<Progress active={addingGarden} />

<form>
  <section>
    <div class="sub-container">
      <h2>Add your garden to the map</h2>
      <div class="section-description">
        {#if !$user}
          <p class="notice">
            You must be signed in to add your garden to the map. Either
            <a class="link" href={routes.SIGN_IN}>sign in</a>
            or
            <a class="link" href={routes.REGISTER}>create an account.</a>
          </p>
        {:else if !$user.emailVerified}
          <p class="notice">
            You need to verify your email before you add your garden to the map. We sent you an
            email when you created your account. You can resend a verification link from your
            <a class="link" href={routes.ACCOUNT}>your profile.</a>
          </p>
        {:else}
          <p>
            By submitting this form, your garden will be added to the map. You can manage or remove
            it at any time from
            <a class="link" href={routes.ACCOUNT}>your profile.</a>
          </p>
        {/if}
      </div>
    </div>
  </section>

  <section class:is-not-fillable={!isFillable}>
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

  <section class:is-not-fillable={!isFillable}>
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

  <section class:is-not-fillable={!isFillable}>
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
          bind:value={garden.facilities.capacity}
          required />
      </div>
    </fieldset>
  </section>
  <section class:is-not-fillable={!isFillable}>
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
  <section class="section-submit" class:is-not-fillable={!isFillable}>
    <div class="sub-container">
      <Button type="button" disabled={addingGarden} on:click={handleSubmit} uppercase medium>
        Add your garden
      </Button>
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

  section {
    width: 100%;
    margin-bottom: 2rem;
    box-shadow: 0px 0px 1rem rgba(0, 0, 0, 0.1);
    position: relative;
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

  p.notice {
    border: 2px solid var(--color-warning);
    border-radius: 0.6rem;
    font-size: 1.6rem;
    padding: 1.6rem;
  }

  .hint {
    margin: 1rem 0;
    font-size: 1.4rem;
    min-height: 2rem;
    width: 100%;
  }

  .hint.invalid {
    color: var(--color-danger);
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

  .is-not-fillable {
    margin-bottom: 0;
  }

  .is-not-fillable:after {
    display: block;
    position: absolute;
    content: '';
    z-index: 10;
    background-color: rgba(0, 0, 0, 0.6);
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
  }
</style>
