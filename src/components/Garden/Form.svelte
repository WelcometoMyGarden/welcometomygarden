<script>
  export let garden;
  export let isSubmitting = false;
  export let isUpdate = false;

  import { _, locale } from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import CoordinateForm from '@/components/Garden/CoordinateForm.svelte';
  import routes from '@/routes';
  import { user } from '@/stores/auth';
  import { LabeledCheckbox, Button } from '@/components/UI';
  import { getGardenPhotoBig } from '@/api/garden';
  import {
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '@/images/icons';

  const dispatch = createEventDispatcher();

  let isFillable = $user && $user.emailVerified;

  let formValid = true;

  let descriptionHint = { message: '', valid: true };
  const validateDescription = (description) => {
    const len = description.length;
    if (len < 20) {
      descriptionHint.valid = false;
      descriptionHint.message = $_('garden.add-garden.description.hints.too-short', {
        values: { remaining: 20 - len }
      });
      return false;
    }
    if (len > 300) {
      descriptionHint.valid = false;
      descriptionHint.message = $_('garden.add-garden.description.hints.too-long', {
        values: { surplus: len - 300 }
      });
      return false;
    }
    descriptionHint.valid = true;
    descriptionHint.message = '';
    return true;
  };

  const updateDescription = (event) => {
    const description = event.target.value;
    validateDescription(description);
    garden.description = description;
  };

  let coordinateHint = { message: '', valid: true };
  const validateLocation = (location) => {
    if (!location) {
      coordinateHint.message = $_('garden.add-garden.location.coordinate-hint');
      coordinateHint.valid = false;
      return false;
    }
    coordinateHint.message = '';
    coordinateHint.valid = true;
    return true;
  };
  const setCoordinates = (event) => {
    validateLocation(event.detail);
    garden.location = event.detail;
  };

  const validFileTypes = ['image/jpeg', 'image/png', 'image/tiff'];
  let photoHint = { message: '', valid: true };
  const validatePhoto = (file) => {
    if (!validFileTypes.includes(file.type)) {
      photoHint.message = $_('garden.add-garden.photo.hints.wrong-format');
      photoHint.valid = false;
      return false;
    }
    // Should be no bigger than 5MB
    if (file.size / 1024 / 1024 > 5) {
      photoHint.message = $_('garden.add-garden.photo.hints.too-large');
      photoHint.valid = false;
      return false;
    }
    photoHint.message = '';
    photoHint.valid = true;
    return true;
  };

  let existingPhoto = garden.photo;
  garden.photo = {};
  const choosePhoto = () => {
    if (!garden.photo.files) return;
    existingPhoto = null;
    const file = garden.photo.files[0];
    if (!validatePhoto(file)) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      garden.photo.data = e.target.result;
    };
  };

  const getExistingPhoto = () => {
    const id = garden && garden.previousPhotoId ? garden.previousPhotoId : $user.id;
    console.log(id);
    return getGardenPhotoBig({ photo: existingPhoto, id });
  };

  const handleSubmit = async () => {
    if (!isFillable) return;
    if (
      [validateDescription(garden.description), validateLocation(garden.location)].includes(false)
    ) {
      formValid = false;
      return;
    }

    if (garden.photo && garden.photo.files && !validatePhoto(garden.photo.files[0])) {
      formValid = false;
      return;
    }

    formValid = true;
    dispatch('submit', garden);
  };

  $: facilities = [
    { name: 'water', icon: waterIcon, label: $_('garden.facilities.labels.water') },
    {
      name: 'drinkableWater',
      icon: waterIcon,
      label: $_('garden.facilities.labels.drinkable-water')
    },
    { name: 'toilet', icon: toiletIcon, label: $_('garden.facilities.labels.toilet') },
    { name: 'bonfire', icon: bonfireIcon, label: $_('garden.facilities.labels.bonfire') },
    {
      name: 'electricity',
      icon: electricityIcon,
      label: $_('garden.facilities.labels.electricity')
    },
    { name: 'shower', icon: showerIcon, label: $_('garden.facilities.labels.shower') },
    { name: 'tent', icon: tentIcon, label: $_('garden.facilities.labels.tent') }
  ];
</script>

<form>
  <section>
    <div class="sub-container">
      <h2>{$_('garden.add-garden.header.title')}</h2>
      <div class="section-description">
        {#if !$user}
          <p class="notice">
            {@html $_('garden.add-garden.header.auth-notice', {
              values: { addSignInLink: routes.SIGN_IN, addRegisterLink: routes.REGISTER }
            })}
          </p>
        {:else if !$user.emailVerified}
          <p class="notice">
            {@html $_('garden.add-garden.header.email-confirm-notice', {
              values: { addAccountLink: routes.ACCOUNT }
            })}
          </p>
        {:else}
          <p>
            {@html $_('garden.add-garden.header.normal-notice', {
              values: { addAccountLink: routes.ACCOUNT }
            })}
          </p>
        {/if}
      </div>
    </div>
  </section>

  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.add-garden.location.title')}</h3>
      <p class="section-description">
        {@html $_('garden.add-garden.location.notice')}
      </p>
      <CoordinateForm initialCoordinates={garden.location} on:confirm={setCoordinates} />
      <p class="hint" class:invalid={!coordinateHint.valid}>{coordinateHint.message}</p>
    </fieldset>
  </section>

  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.add-garden.description.title')}</h3>
      <p class="section-description">
        {@html $_('garden.add-garden.description.notice')}
      </p>
      <div>
        <textarea
          placeholder={$_('garden.add-garden.description.placeholder')}
          aria-label={$_('garden.add-garden.description.label')}
          id="description"
          name="description"
          value={garden.description}
          on:input={updateDescription}
          on:keypress={(e) => {
            if ((e.keyCode || e.which) == 13) {
              e.preventDefault();
            }
          }} />
        <p class="hint" class:invalid={!descriptionHint.valid}>{descriptionHint.message}</p>
      </div>
    </fieldset>
  </section>

  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.add-garden.facilities.title')}</h3>
      <p class="section-description">{$_('garden.add-garden.facilities.notice')}</p>
      <div class="checkboxes">
        {#each facilities as facility (facility.name)}
          <LabeledCheckbox {...facility} bind:checked={garden.facilities[facility.name]} />
        {/each}
      </div>
      <div class="capacity">
        <label for="capacity">{$_('garden.add-garden.facilities.capacity.label')}</label>
        <p>{$_('garden.add-garden.facilities.capacity.help')}</p>
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
      <h3>{$_('garden.add-garden.photo.title')}</h3>
      <p class="section-description">
        {@html $_('garden.add-garden.photo.notice')}
      </p>
      <input
        type="file"
        id="photo"
        name="photo"
        bind:files={garden.photo.files}
        on:change={choosePhoto}
        multiple={false}
        accept={validFileTypes.join(',')} />

      {#if garden.photo && garden.photo.data}
        <div class="photo" transition:slide>
          <img src={garden.photo.data} alt={$_('garden.add-garden.photo.img-alt')} />
        </div>
      {:else if existingPhoto && typeof existingPhoto == 'string'}
        {#await getExistingPhoto() then existingPhoto}
          <div class="photo" transition:slide>
            <img src={existingPhoto} alt={$_('garden.add-garden.photo.img-alt')} />
          </div>
        {/await}
      {/if}

      <p class="hint" class:invalid={!photoHint.valid}>{photoHint.message}</p>
    </fieldset>
  </section>
  <section class="section-submit" class:is-not-fillable={!isFillable}>
    <div class="sub-container">
      <Button type="button" disabled={isSubmitting} on:click={handleSubmit} uppercase medium>
        {$_('garden.add-garden.button', { values: { isUpdate } })}
      </Button>
      {#if !formValid}
        <p class="hint invalid" transition:slide>{$_('garden.add-garden.invalid')}</p>
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
