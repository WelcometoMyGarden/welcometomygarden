<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import { goto } from '$lib/util/navigate';
  import { register } from '$lib/api/auth';
  import { formEmailValue, formPasswordValue, isRegistering } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import routes from '$lib/routes';
  import { countryNames, guessCountryCode } from '$lib/stores/countryNames';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { TextInput, Progress, Button, Select } from '$lib/components/UI';
  import { lockIcon, emailIcon, userIcon } from '$lib/images/icons';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import { AuthErrorCodes } from 'firebase/auth';
  import isFirebaseError from '$lib/util/types/isFirebaseError';
  import validateEmail from '$lib/util/validate-email';

  type FieldCommon = {
    /**
     * Populated by value validation. When error equals the empty string, there is no error,
     * and the value can be considered valid.
     */
    error?: string;
  };

  type TextInputField = FieldCommon & {
    /**
     * Populated by a binding to an input.
     */
    value?: string;
    /**
     * Validates the value of this input field.
     */
    validate: (value: string | undefined) => string | undefined;
  };

  type CheckboxField = FieldCommon & {
    /**
     * Populated by a binding to an input.
     */
    value?: boolean;
    /**
     * Validates the value of this input field.
     */
    validate: (value: boolean | undefined) => string | undefined;
  };

  type RegistrationFields =
    // Text inputs
    {
      [fieldName in 'email' | 'password' | 'firstName' | 'lastName' | 'country']: TextInputField;
    } & { consent: CheckboxField }; // Checkbox fields

  /** Field definitions with initial values */
  let fields: RegistrationFields = {
    email: {
      validate: (v) => {
        if (!v || !validateEmail(v)) return $_('register.validate.email');
      }
    },
    password: {
      validate: (v) => {
        if (!v) return $_('register.validate.password.set');
        if (v.length < 8) return $_('register.validate.password.min');
        // Primarily to prevent password length denial of service
        if (v.length > 100) return $_('register.validate.password.max');
      }
    },
    firstName: {
      validate: (v) => {
        if (!v || v.trim() === '') return $_('register.validate.first-name.set');
        if (v.length > 25) return $_('register.validate.first-name.max');
      }
    },
    lastName: {
      validate: (v) => {
        if (!v || v.trim() === '') return $_('register.validate.last-name');
      }
      // TODO: why is there no max-length constraint on last-name?
    },
    country: {
      value: guessCountryCode(),
      validate: (v?: string) => {
        if (!v || !$countryNames[v]) {
          return $_('register.validate.country.from-list');
        }
      }
    },
    consent: {
      value: false,
      validate: (v) => {
        if (!v) return $_('register.validate.consent');
      }
    }
  };

  // Connect email & password stores to the data structure used for validation
  $: fields.email.value = $formEmailValue;
  $: fields.password.value = $formPasswordValue;

  $: countryEntries = Object.entries($countryNames).sort(([, nameA], [, nameB]) =>
    nameA.localeCompare(nameB)
  );

  let formError = '';

  const submit = async () => {
    // Validate all fields
    let errorCount = 0;
    (Object.keys(fields) as (keyof typeof fields)[]).forEach((fieldName) => {
      const field = fields[fieldName];
      // Type narrowing takes out the common "undefined" as the only possible type for v.
      // We know the validation function is able to handle its own input
      const error = (field.validate as (v: string | boolean | undefined) => string | undefined)(
        field.value
      );
      fields[fieldName].error = error || '';
      if (error) errorCount++;
    });

    fields = fields;
    if (errorCount > 0) {
      // Cancel submission
      return;
    }

    try {
      await register({
        // We know that these fields are validated.
        email: $formEmailValue,
        password: $formPasswordValue,
        firstName: fields.firstName.value as string,
        lastName: fields.lastName.value as string,
        countryCode: fields.country.value as string
      });
      notify.success($_('register.notify.successful'), 10000);
      goto(routes.MAP);
    } catch (err: unknown) {
      isRegistering.set(false);
      if (isFirebaseError(err) && err.code === AuthErrorCodes.EMAIL_EXISTS)
        formError = $_('register.notify.in-use');
      else formError = $_('register.notify.unexpected', { values: { support: SUPPORT_EMAIL } });
      console.log(err);
    }
  };

  const cookiePolicy = `<a class="link" href=${routes.COOKIE_POLICY} target="_blank" >${$_(
    'generics.cookie-policy'
  ).toLocaleLowerCase()}</a>`;
  const privacyPolicy = `<a class="link" href=${routes.PRIVACY_POLICY} target="_blank">${$_(
    'generics.privacy-policy'
  ).toLocaleLowerCase()}</a>`;
  const termsOfUse = `<a class="link" href=${routes.TERMS_OF_USE} target="_blank">${$_(
    'generics.terms-of-use'
  ).toLocaleLowerCase()}</a>`;
</script>

<svelte:head>
  <title>{$_('register.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={$isRegistering} />

<AuthContainer>
  <span slot="title">{$_('register.title')}</span>
  <!--
    Switch off built-in form validation (we implement our own)
    https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#a_more_detailed_example
  -->
  <form novalidate on:submit|preventDefault={submit} slot="form">
    <div>
      <label for="first-name">{$_('register.first-name')}</label>
      <TextInput
        icon={userIcon}
        type="text"
        name="first-name"
        id="first-name"
        autocomplete="given-name"
        on:blur={() => (fields.firstName.error = '')}
        error={fields.firstName.error}
        bind:value={fields.firstName.value}
      />
    </div>

    <div>
      <label for="last-name">{$_('register.last-name')}</label>
      <TextInput
        icon={userIcon}
        autocomplete="family-name"
        type="text"
        name="last-name"
        id="last-name"
        on:blur={() => (fields.lastName.error = '')}
        error={fields.lastName.error}
        bind:value={fields.lastName.value}
      />
    </div>

    <div>
      <label for="email">{$_('generics.email')}</label>
      <TextInput
        icon={emailIcon}
        autocomplete="email"
        type="email"
        name="email"
        id="email"
        required
        on:blur={() => {
          fields.email.error = '';
        }}
        error={fields.email.error}
        bind:value={$formEmailValue}
      />
    </div>

    <div>
      <label for="password">{$_('generics.password')}</label>
      <TextInput
        icon={lockIcon}
        type="password"
        name="password"
        id="password"
        autocomplete="new-password"
        on:blur={() => (fields.password.error = '')}
        error={fields.password.error}
        bind:value={$formPasswordValue}
      />
    </div>

    <div class="country-select">
      <label for="country">{$_('register.country')}</label>
      <Select name="country" bind:value={fields.country.value} fullBlock>
        {#each countryEntries as [code, name]}
          <option value={code}>{name}</option>
        {/each}
      </Select>
    </div>
    <div class="consent">
      <div class="checkbox">
        <input type="checkbox" id="terms" name="terms" bind:checked={fields.consent.value} />
        <label for="terms">
          {@html $_('register.policies', {
            values: {
              cookiePolicy: cookiePolicy,
              privacyPolicy: privacyPolicy,
              termsOfUse: termsOfUse
            }
          })}
        </label>
      </div>
      <div class="error">
        {#if fields.consent.error}{fields.consent.error}{/if}
      </div>
    </div>

    <div class="submit">
      <div class="hint">
        {#if formError}
          <p transition:fade class="hint danger">{formError}</p>
        {/if}
      </div>
      <Button type="submit" medium disabled={$isRegistering}>{$_('register.button')}</Button>
      {#if $isRegistering}
        <p class="mt-m mb-m">{$_('register.registering')}</p>
      {/if}
      <p>
        {@html $_('register.registred', {
          values: {
            signIn: `<a class="link" href=${routes.SIGN_IN}>${$_('generics.sign-in')}</a>`
          }
        })}
      </p>
    </div>
  </form>
</AuthContainer>

<style>
  form > div {
    margin-bottom: 1.2rem;
  }

  .submit {
    text-align: center;
  }

  .submit > p {
    margin-top: 1rem;
  }

  .hint {
    margin-bottom: 0;
  }

  .error {
    min-height: 3rem;
    color: var(--color-danger);
    display: block;
    line-height: 1.4;
  }

  .checkbox {
    display: flex;
    align-items: center;
  }

  input[type='checkbox'] {
    width: 2rem;
    height: 2rem;
    margin-right: 0.5rem;
  }
  @media screen and (max-width: 700px) {
    input[type='checkbox'] {
      width: 3rem;
      height: 3rem;
      margin-right: 1rem;
    }
  }

  .checkbox label {
    margin-left: 0.8rem;
  }

  label[for='country'] {
    display: block;
    margin-bottom: 0.8rem;
  }

  label[for='terms'] {
    line-height: 1.5;
  }

  .country-select :global(select) {
    margin-bottom: 2.5rem;
  }
</style>
