<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import { goto, universalGoto } from '$lib/util/navigate';
  import {
    email as emailValidator,
    password as passwordValidator,
    type Validator,
    firstName as firstNameValidator,
    lastName as lastNameValidator,
    country as countryValidator,
    consent as consentValidator,
    reference as referenceValidator
  } from '$lib/util/validators';
  import { register } from '$lib/api/auth';
  import {
    formEmailValue,
    formPasswordValue,
    isSigningIn,
    resolveOnUserLoaded,
    user
  } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import routes, { getBaseRouteIn } from '$lib/routes';
  import { countryNames, guessCountryCode } from '$lib/stores/countryNames';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { TextInput, Progress, Button, Select } from '$lib/components/UI';
  import { emailIcon, userIcon } from '$lib/images/icons';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import type { FunctionsErrorCode } from 'firebase/functions';
  import isFirebaseError from '$lib/util/types/isFirebaseError';
  import { page } from '$app/state';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import * as Sentry from '@sentry/sveltekit';
  import { debounce } from 'lodash-es';
  import { lr, type LocalizedMessage } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';
  import PasswordInput from '$lib/components/UI/PasswordInput.svelte';

  const continueUrl = $derived(page.url.searchParams.get('continueUrl'));

  type FieldCommon = {
    /**
     * Populated by value validation. When error equals the empty string, there is no error,
     * and the value can be considered valid.
     */
    error?: LocalizedMessage | null;
  };

  type TextInputField = FieldCommon & {
    /**
     * Populated by a binding to an input.
     */
    value?: string;
    /**
     * Validates the value of this input field.
     */
    validate: Validator;
  };

  type CheckboxField = FieldCommon & {
    /**
     * Populated by a binding to an input.
     */
    value?: boolean;
    /**
     * Validates the value of this input field.
     */
    validate: Validator;
  };

  type RegistrationFields =
    // Text inputs
    {
      [fieldName in
        | 'email'
        | 'password'
        | 'firstName'
        | 'lastName'
        | 'country'
        | 'reference']: TextInputField;
    } & { consent: CheckboxField }; // Checkbox fields

  /** Field definitions with initial values */
  let fields: RegistrationFields = $state({
    email: {
      validate: emailValidator
    },
    password: {
      validate: passwordValidator
    },
    firstName: {
      validate: firstNameValidator
    },
    lastName: {
      validate: lastNameValidator
    },
    country: {
      value: guessCountryCode(),
      validate: countryValidator
    },
    consent: {
      value: false,
      validate: consentValidator
    },
    reference: {
      validate: referenceValidator
    }
  });

  // Connect email & password stores to the data structure used for validation
  $effect(() => {
    fields.email.value = $formEmailValue;
    fields.password.value = $formPasswordValue;
  });

  let countryEntries = $derived(
    Object.entries($countryNames).sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
  );

  let formError = $state<LocalizedMessage | null>(null);

  const submit = async () => {
    // Already set this now, to transition the form submit button to "disabled"
    // as soon as possible, even before field evaluations.
    isSigningIn.set(true);
    formError = null;
    Sentry.addBreadcrumb({ message: 'Attempt to register', level: 'info' });
    // Validate all fields
    let errorCount = 0;
    (Object.keys(fields) as (keyof typeof fields)[]).forEach((fieldName) => {
      const field = fields[fieldName];
      // Type narrowing takes out the common "undefined" as the only possible type for v.
      // We know the validation function is able to handle its own input
      const error = (
        field.validate as (v: string | boolean | undefined) => LocalizedMessage | undefined
      )(field.value);
      fields[fieldName].error = error || null;
      if (error) errorCount++;
    });

    fields = fields;
    if (errorCount > 0) {
      // Cancel submission
      Sentry.captureMessage('Registration form validation failed', {
        level: 'info',
        extra: {
          errors: Object.fromEntries(
            Object.entries(fields)
              .filter(([, field]) => field.error)
              .map(([name, field]) => [name, field.error?.key])
          )
        }
      });
      isSigningIn.set(false);
      return;
    }

    try {
      await register({
        // We know that these fields are validated.
        email: $formEmailValue,
        password: $formPasswordValue,
        firstName: fields.firstName.value as string,
        lastName: fields.lastName.value as string,
        countryCode: fields.country.value as string,
        reference: (fields.reference.value as string)?.trim() || null
      });
      notify.success($_('register.notify.successful'), 10000);
      if (continueUrl) {
        if (getBaseRouteIn(continueUrl) === routes.ADD_GARDEN && !get(user)?.emailVerified) {
          // If the intention is to add a garden, but the user is not verified, redirect to the account page
          logger.log(
            'Redirecting to /account upon unverified email sign-up with a garden add intention'
          );
          universalGoto($lr(routes.ACCOUNT));
        } else {
          universalGoto(continueUrl);
        }
      } else {
        goto($lr(routes.MAP));
      }
    } catch (err: unknown) {
      isSigningIn.set(false);
      if (
        isFirebaseError(err) &&
        err.code === ('functions/already-exists' satisfies FunctionsErrorCode)
      ) {
        formError = { key: 'register.notify.in-use' };
        Sentry.captureMessage('Registration failed - email in use', {
          level: 'info' // This is an expected error case
        });
      } else if (
        isFirebaseError(err) &&
        err.code === ('functions/invalid-argument' satisfies FunctionsErrorCode) &&
        err.message === 'auth/invalid-email'
      ) {
        formError = { key: 'register.notify.invalid' };
        Sentry.captureMessage('Registration failed - invalid email', {
          level: 'info' // This is an expected error case
        });
      } else {
        formError = {
          key: 'register.notify.unexpected',
          options: { values: { support: SUPPORT_EMAIL } }
        };
        Sentry.captureException(err);
      }
      logger.log(err);
    }
  };

  // Avoids duplicate accounts being created. We only want this to be called once.
  // It seems like `trailing: false` should be specified to avoid a calling a second time at the trailing end
  // if more than 1 call came within the 1000 ms wait
  // Note: 1000ms: we should be careful to not block the method when people don't agree to the terms at first,
  // and are able to re-click the submit button within 1000ms. Maybe we could issue a cancel/reset when the checkbox is clicked?
  const debouncedSubmit = debounce(submit, 1000, { leading: true, trailing: false });

  const cookiePolicy = $derived(
    `<a class="link" href=${$lr(routes.COOKIE_POLICY)} target="_blank" >${$_(
      'generics.cookie-policy'
    ).toLocaleLowerCase()}</a>`
  );
  const privacyPolicy = $derived(
    `<a class="link" href=${$lr(routes.PRIVACY_POLICY)} target="_blank">${$_(
      'generics.privacy-policy'
    ).toLocaleLowerCase()}</a>`
  );
  const termsOfUse = $derived(
    `<a class="link" href=${$lr(routes.TERMS_OF_USE)} target="_blank">${$_(
      'generics.terms-of-use'
    ).toLocaleLowerCase()}</a>`
  );

  onMount(async () => {
    await resolveOnUserLoaded();
    if (get(user)) {
      // If a user is already logged in, redirect to /account
      goto($lr(routes.ACCOUNT));
    }
  });
</script>

<svelte:head>
  <title>{$_('register.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={$isSigningIn} />

<AuthContainer>
  {#snippet title()}
    <span>{$_('register.title')}</span>
  {/snippet}
  <!--
    Switch off built-in form validation (we implement our own)
    https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#a_more_detailed_example
  -->
  {#snippet form()}
    <form
      novalidate
      onsubmit={(e) => {
        e.preventDefault();
        debouncedSubmit();
      }}
    >
      <div>
        <label for="first-name">{$_('register.first-name')}</label>
        <TextInput
          icon={userIcon}
          type="text"
          name="first-name"
          id="first-name"
          autocomplete="given-name"
          onblur={() => (fields.firstName.error = null)}
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
          onblur={() => (fields.lastName.error = null)}
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
          onblur={() => {
            fields.email.error = null;
          }}
          error={fields.email.error}
          bind:value={$formEmailValue}
        />
      </div>

      <div>
        <PasswordInput
          autocomplete="new-password"
          onblur={() => (fields.password.error = null)}
          error={fields.password.error}
          bind:value={$formPasswordValue}
        />
      </div>

      <div class="country-select">
        <label for="country">{$_('register.country')}</label>
        <Select name="country" autocomplete="country" bind:value={fields.country.value} fullBlock>
          {#each countryEntries as [code, name]}
            <option value={code}>{name}</option>
          {/each}
        </Select>
      </div>

      <div class="reference">
        <label for="reference">{$_('register.reference')}</label>
        <TextInput
          icon={null}
          type="text"
          name="reference"
          id="reference"
          maxLength={3000}
          onblur={() => (fields.reference.error = null)}
          error={fields.reference.error}
          bind:value={fields.reference.value}
        />
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
          {#if fields.consent.error}{@html $_(
              fields.consent.error.key,
              fields.consent.error.options
            )}{/if}
        </div>
      </div>

      <div class="submit">
        <div class="hint">
          {#if formError}
            <p transition:fade class="hint danger">{$_(formError.key, formError.options)}</p>
          {/if}
        </div>
        <Button type="submit" medium disabled={$isSigningIn}>{$_('register.button')}</Button>
        {#if $isSigningIn}
          <p class="mt-m mb-m">{$_('register.registering')}</p>
        {/if}
        <p>
          {@html $_('register.registered', {
            values: {
              signIn: `<a class="link" href="${$lr(routes.SIGN_IN)}${continueUrl ? `?continueUrl=${encodeURIComponent(continueUrl)}` : ''}">${$_('generics.sign-in')}</a>`
            }
          })}
        </p>
      </div>
    </form>
  {/snippet}
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
