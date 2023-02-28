<script lang="ts">
  /**
   * The default initial garden state, or existing garden details if one exists.
   */
  export let garden: GardenToUpload;
  export let isSubmitting = false;
  export let isUpdate = false;

  import { _ } from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import CoordinateForm from '$lib/components/Garden/CoordinateForm.svelte';
  import routes from '$lib/routes';
  import { user } from '$lib/stores/auth';
  import { LabeledCheckbox, Button } from '$lib/components/UI';
  import { getGardenPhotoBig } from '$lib/api/garden';
  import {
    bonfireIcon,
    electricityIcon,
    showerIcon,
    toiletIcon,
    waterIcon,
    tentIcon
  } from '$lib/images/icons';
  import ReloadSuggestion from '../ReloadSuggestion.svelte';
  import type { GardenFacilities, GardenToUpload, LatLong } from '$lib/types/Garden';

  const dispatch = createEventDispatcher<{ submit: GardenToUpload }>();

  $: isFillable = $user && $user.emailVerified;

  let formValid = true;

  let descriptionHint = { message: '', valid: true };
  const validateDescription = (description: string) => {
    const len = description.length;
    if (len < 20) {
      descriptionHint.valid = false;
      descriptionHint.message = $_('garden.form.description.hints.too-short', {
        values: { remaining: 20 - len }
      });
      return false;
    }
    if (len > 300) {
      descriptionHint.valid = false;
      descriptionHint.message = $_('garden.form.description.hints.too-long', {
        values: { surplus: len - 300 }
      });
      return false;
    }
    descriptionHint.valid = true;
    descriptionHint.message = '';
    return true;
  };

  const validateFacilities = (facilities: GardenFacilities) => {
    for (let expectedFacility of booleanFacilities) {
      if (typeof facilities[expectedFacility.name] !== 'boolean') {
        console.error('Unexpected invalid boolean facility');
        return false;
      }
      if (typeof facilities.capacity !== 'number' || facilities.capacity < 1) {
        // This should be prevented by HTML number input validation
        console.error('Unexpected invalid capacity facility');
        return false;
      }
    }
    return true;
  };

  // event typing: https://stackoverflow.com/a/72340285/4973029
  const updateDescription = (event: Event & { currentTarget: HTMLTextAreaElement }) => {
    const description = event.currentTarget.value;
    validateDescription(description);
    garden.description = description;
  };

  let coordinateHint = { message: '', valid: true };
  const validateLocation = (location: null | LatLong) => {
    if (!location) {
      coordinateHint.message = $_('garden.form.location.coordinate-hint');
      coordinateHint.valid = false;
      return false;
    }
    coordinateHint.message = '';
    coordinateHint.valid = true;
    return true;
  };

  const setCoordinates = (event: CustomEvent<LatLong | null>) => {
    validateLocation(event.detail);
    // validated not null by the above function
    garden.location = event.detail as LatLong;
  };

  const validFileTypes = ['image/jpeg', 'image/png', 'image/tiff'];

  let selectedFiles: FileList;

  let photoHint = { message: '', valid: true };
  const validatePhoto = (file: File) => {
    if (!validFileTypes.includes(file.type)) {
      photoHint.message = $_('garden.form.photo.hints.wrong-format');
      photoHint.valid = false;
      return false;
    }
    // Should be no bigger than 5MB
    if (file.size / 1024 / 1024 > 5) {
      photoHint.message = $_('garden.form.photo.hints.too-large');
      photoHint.valid = false;
      return false;
    }
    photoHint.message = '';
    photoHint.valid = true;
    return true;
  };

  let existingPhoto = garden.photo;

  /**
   * Called when the file input changes, that is, when the user
   * has selected photos
   */
  const onSelectedPhotos = () => {
    if (!selectedFiles) return;
    existingPhoto = null;
    const file = selectedFiles[0];
    if (!validatePhoto(file)) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      if (!e.target) {
        console.warn('Unexpected null target when reading the selected photo');
        return;
      }
      // We know it is a string, because we called readAsDataURL on the reader
      // http://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
      garden.photo = {
        file,
        data: e.target.result as string
      };
    };
  };

  /**
   * Gets the image URL of the photo referenced by the photo ID, previousPhotoId, or user ID
   * of this garden.
   */
  const getExistingPhoto = () => {
    const id = garden && garden.previousPhotoId ? garden.previousPhotoId : $user.id;
    return getGardenPhotoBig({ photo: existingPhoto, id });
  };

  const handleSubmit = async () => {
    if (!isFillable) return;
    if (
      [
        validateDescription(garden.description),
        validateLocation(garden.location),
        validateFacilities(garden.facilities)
      ].includes(false)
    ) {
      formValid = false;
      return;
    }

    formValid = true;
    dispatch('submit', garden);
  };

  let booleanFacilities: {
    icon: string;
    name: keyof Omit<GardenFacilities, 'capacity'>;
    label: string;
  }[];

  $: booleanFacilities = [
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
      <h2>{$_('garden.form.title')}</h2>
      <div class="section-description">
        {#if !$user}
          <p class="notice">
            {@html $_('garden.form.auth-notice', {
              values: {
                signInLink: `<a class='link' href=${routes.SIGN_IN}>${$_(
                  'garden.form.sign-in-link-text'
                )}</a>`,
                registerLink: `<a class='link' href=${routes.REGISTER}>${$_(
                  'garden.form.register-link-text'
                )}</a>`
              }
            })}
          </p>
        {:else if !$user.emailVerified}
          <p class="notice">
            {@html $_('garden.form.email-confirm-notice', {
              values: {
                accountLink: `<a class='link' href=${routes.ACCOUNT}>${$_(
                  'garden.form.account-link-text'
                )}</a>`
              }
            })}
            <ReloadSuggestion />
          </p>
        {:else}
          <p>
            {@html $_('garden.form.normal-notice', {
              values: {
                accountLink: `<a class='link' href=${routes.ACCOUNT}>${$_(
                  'garden.form.account-link-text'
                )}</a>`
              }
            })}
          </p>
        {/if}
      </div>
    </div>
  </section>

  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.form.location.title')}</h3>
      <p class="section-description">
        {@html $_('garden.form.location.notice')}
      </p>
      <CoordinateForm initialCoordinates={garden.location} on:confirm={setCoordinates} />
      <p class="hint" class:invalid={!coordinateHint.valid}>{coordinateHint.message}</p>
    </fieldset>
  </section>

  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.form.description.title')}</h3>
      <p class="section-description">
        {@html $_('garden.form.description.notice')}
      </p>
      <div>
        <textarea
          placeholder={$_('garden.form.description.placeholder')}
          aria-label={$_('garden.form.description.label')}
          id="description"
          name="description"
          value={garden.description}
          on:input={updateDescription}
          on:keypress={(e) => {
            if ((e.keyCode || e.which) == 13) {
              e.preventDefault();
            }
          }}
        />
        <p class="hint" class:invalid={!descriptionHint.valid}>{descriptionHint.message}</p>
      </div>
    </fieldset>
  </section>

  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.form.facilities.title')}</h3>
      <p class="section-description">{$_('garden.form.facilities.notice')}</p>
      <div class="checkboxes">
        {#each booleanFacilities as facility (facility.name)}
          <LabeledCheckbox {...facility} bind:checked={garden.facilities[facility.name]} compact />
        {/each}
      </div>
      <div class="capacity">
        <label for="capacity">{$_('garden.form.facilities.capacity.label')}</label>
        <p>{$_('garden.form.facilities.capacity.help')}</p>
        <input
          type="number"
          name="capacity"
          min="1"
          id="capacity"
          max="20"
          bind:value={garden.facilities.capacity}
          required
        />
      </div>
    </fieldset>
  </section>
  <section class:is-not-fillable={!isFillable}>
    <fieldset>
      <h3>{$_('garden.form.photo.title')}</h3>
      <p class="section-description">
        {@html $_('garden.form.photo.notice')}
      </p>
      <input
        type="file"
        id="photo"
        name="photo"
        bind:files={selectedFiles}
        on:change={onSelectedPhotos}
        multiple={false}
        accept={validFileTypes.join(',')}
      />

      {#if garden.photo && !(typeof garden.photo === 'string') && garden.photo.data}
        <!-- Preview the selected photo -->
        <div class="photo" transition:slide>
          <img src={garden.photo.data} alt={$_('garden.form.photo.img-alt')} />
        </div>
      {:else if existingPhoto && typeof existingPhoto == 'string'}
        <!-- Preview an existing photo -->
        {#await getExistingPhoto() then existingPhoto}
          <div class="photo" transition:slide>
            <img src={existingPhoto} alt={$_('garden.form.photo.img-alt')} />
          </div>
        {/await}
      {/if}

      <p class="hint" class:invalid={!photoHint.valid}>{photoHint.message}</p>
    </fieldset>
  </section>
  <section class="section-submit" class:is-not-fillable={!isFillable}>
    <div class="sub-container">
      <Button type="button" disabled={isSubmitting} on:click={handleSubmit} uppercase medium>
        {#if isUpdate}{$_('garden.form.update-button')}{:else}{$_('garden.form.add-button')}{/if}
      </Button>
      {#if !formValid}
        <p class="hint invalid" transition:slide>{$_('garden.form.invalid')}</p>
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
    font-size: var(--paragraph-font-size);
    line-height: 1.6;
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
    font-weight: 600;
    margin-top: 2rem;
  }

  h3 {
    font-size: 1.8rem;
    font-weight: 500;
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
