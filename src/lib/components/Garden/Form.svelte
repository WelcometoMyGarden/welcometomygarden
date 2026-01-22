<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { slide } from 'svelte/transition';
  import CoordinateForm from '$lib/components/Garden/CoordinateForm.svelte';
  import routes from '$lib/routes';
  import { user } from '$lib/stores/auth';
  import { LabeledCheckbox, Button } from '$lib/components/UI';
  import { getGardenPhotoBig } from '$lib/api/garden';
  import type { FirebaseGarden, GardenDraft, LongLat } from '$lib/types/Garden';
  import type { FormEventHandler } from 'svelte/elements';
  import { facilities } from '$lib/stores/facilities';
  import { MAX_GARDEN_CAPACITY } from '$lib/constants';
  import { lr } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';
  interface Props {
    isSubmitting?: boolean;
    isUpdate?: boolean;
    onsubmit: (garden: GardenDraft) => void;
  }

  let { isSubmitting = false, isUpdate = false, onsubmit }: Props = $props();

  // Note: this component should only be loaded if the garden is loaded.
  const existingGarden: FirebaseGarden | null = $user?.garden ?? null;
  const initialGarden: GardenDraft = {
    description: '',
    location: null,
    facilities: {
      capacity: 1
    },
    photo: {
      files: null,
      data: null
    },
    listed: true
  };

  /**
   * The current garden draft to be edited by the form
   */
  const garden: GardenDraft = $state({
    ...(existingGarden ? { ...existingGarden } : { ...initialGarden }),
    photo: { files: undefined, data: null }
  });

  let formValid = $state(true);

  let descriptionHint = $state({ message: '', valid: true });
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

  const updateDescription = ((event) => {
    const description = (event.target as HTMLTextAreaElement).value;
    validateDescription(description);
    garden.description = description;
  }) satisfies FormEventHandler<HTMLTextAreaElement>;

  let coordinateHint = $state({ message: '', valid: true });
  const validateLocation = (location: LongLat | null) => {
    if (!location) {
      coordinateHint.message = $_('garden.form.location.coordinate-hint');
      coordinateHint.valid = false;
      return false;
    }
    coordinateHint.message = '';
    coordinateHint.valid = true;
    return true;
  };
  const setCoordinates = (event: LongLat | null) => {
    validateLocation(event);
    garden.location = event;
  };

  const validFileTypes = ['image/jpeg', 'image/png', 'image/tiff'];
  let photoHint = $state({ message: '', valid: true });
  const validatePhoto = (file: File) => {
    if (!validFileTypes.includes(file.type)) {
      photoHint.message = $_('garden.form.photo.hints.wrong-format');
      photoHint.valid = false;
      return false;
    }
    // Should be no bigger than 30 MB
    if (file.size / 1024 / 1024 > 30) {
      photoHint.message = $_('garden.form.photo.hints.too-large');
      photoHint.valid = false;
      return false;
    }
    photoHint.message = '';
    photoHint.valid = true;
    return true;
  };

  let existingPhoto: null | string = $state(existingGarden ? existingGarden.photo : null);

  const choosePhoto = () => {
    // The garden.photo property must have been reset before executing this function.
    if (typeof garden.photo === 'string' || !garden.photo?.files || garden.photo.files.length === 0)
      return;
    existingPhoto = null;
    const file = garden.photo.files[0];
    if (!validatePhoto(file)) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      if (e.target && typeof garden.photo !== 'string' && garden.photo != null) {
        // It should be a base64-encoded string
        // https://developer.mozilla.org/en-US/docs/Web/API/FileReader/readAsDataURL
        garden.photo.data = e.target.result as string;
      } else {
        logger.warn(
          'Uploaded photo reader, or target object are unexpectedly falsy when reading it'
        );
      }
    };
  };

  /**
   * Should only be called when photo & user.id are instantiated
   */
  const getExistingPhoto = () => {
    return getGardenPhotoBig({ photo: existingPhoto as string, id: $user?.id as string });
  };

  const handleSubmit = async () => {
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
    onsubmit(garden);
  };
</script>

<!--
  multipart/form-data is added here for futureproofing, in case we ever want to
  progressively enhance this action, see https://kit.svelte.dev/docs/migrating-to-sveltekit-2#forms-containing-file-inputs-must-use-multipart-form-data
  -->
<form enctype="multipart/form-data">
  <section>
    <div class="sub-container">
      <h2>{isUpdate ? $_('garden.form.manage.title') : $_('garden.form.add.title')}</h2>
      <div class="section-description">
        <p>
          {@html isUpdate
            ? $_('garden.form.manage.normal-notice', {
                values: {
                  accountLink: `<a class='link' href=${$lr(routes.ACCOUNT)}>${$_(
                    'generics.account-page'
                  )}</a>`
                }
              })
            : $_('garden.form.add.normal-notice', {
                values: {
                  accountLink: `<a class='link' href=${$lr(routes.ACCOUNT)}>${$_(
                    'generics.account-page'
                  )}</a>`
                }
              })}
        </p>
      </div>
    </div>
  </section>

  <section>
    <fieldset>
      <h3>{$_('garden.form.location.title')}</h3>
      <p class="section-description">
        {@html $_('garden.form.location.notice')}
      </p>
      <CoordinateForm initialCoordinates={garden.location} onconfirm={setCoordinates} />
      <p class="hint" class:invalid={!coordinateHint.valid}>{coordinateHint.message}</p>
    </fieldset>
  </section>

  <section>
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
          oninput={updateDescription}
          onkeypress={(e) => {
            if ((e.keyCode || e.which) == 13) {
              e.preventDefault();
            }
          }}
        ></textarea>
        <p class="hint" class:invalid={!descriptionHint.valid}>{descriptionHint.message}</p>
      </div>
    </fieldset>
  </section>

  <section>
    <fieldset>
      <h3>{$_('garden.form.facilities.title')}</h3>
      <p class="section-description">{$_('garden.form.facilities.notice')}</p>
      <div class="checkboxes">
        {#each $facilities as facility (facility.name)}
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
          max={MAX_GARDEN_CAPACITY}
          bind:value={garden.facilities.capacity}
          required
        />
      </div>
    </fieldset>
  </section>
  <section>
    <fieldset>
      <h3>{$_('garden.form.photo.title')}</h3>
      <p class="section-description">
        {@html $_('garden.form.photo.notice')}
      </p>
      <input
        type="file"
        id="photo"
        name="photo"
        bind:files={garden.photo.files}
        onchange={choosePhoto}
        multiple={false}
        accept={validFileTypes.join(',')}
      />

      {#if garden.photo && typeof garden.photo !== 'string' && garden.photo.data}
        <div class="photo" transition:slide>
          <img src={garden.photo.data} alt={$_('garden.form.photo.img-alt')} />
        </div>
      {:else if existingPhoto && typeof existingPhoto == 'string'}
        {#await getExistingPhoto() then existingPhoto}
          <div class="photo" transition:slide>
            <img src={existingPhoto} alt={$_('garden.form.photo.img-alt')} />
          </div>
        {/await}
      {/if}

      <p class="hint" class:invalid={!photoHint.valid}>{photoHint.message}</p>
    </fieldset>
  </section>
  <section class="section-submit">
    <div class="sub-container">
      <Button type="button" disabled={isSubmitting} onclick={handleSubmit} uppercase medium>
        {$_(`garden.form.${isUpdate ? 'manage' : 'add'}.button`)}
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

  /* Protect against long filenames */
  input#photo {
    width: 90%;
    word-break: break-all;
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
