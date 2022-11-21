<script>
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import { register } from '@/lib/api/auth';
  import { isRegistering } from '@/lib/stores/auth';
  import notify from '$lib/stores/notification';
  import { countries } from '$lib/util';
  import routes from '$lib/routes';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { TextInput, Progress, Button } from '$lib/components/UI';
  import { lockIcon, emailIcon, userIcon, flagIcon } from '$lib/images/icons';
  import { SUPPORT_EMAIL } from '$lib/constants';

  let fields = {
    email: {
      validate: (v) => {
        if (!v) return $_('register.validate.email');
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
        if (!v) return $_('register.validate.first-name.set');
        if (v.length > 25) return $_('register.validate.first-name.max');
      }
    },
    lastName: {
      validate: (v) => {
        if (!v) return $_('register.validate.last-name');
      }
    },
    country: {
      validate: (v) => {
        if (!v) return $_('register.validate.country.set');
      }
    },
    consent: {
      value: false,
      validate: (v) => {
        if (!v) return $_('register.validate.consent');
      }
    }
  };
  let countryCode;
  let countryInput;

  const validateCountry = (v) => {
    const value = v ? v.toLowerCase() : v;
    const code = Object.keys(countries).find((key) => countries[key].toLowerCase() === value);
    if (!code) {
      const error = $_('register.validate.country.from-list');
      fields.country.error = error;
      return error;
    } else {
      countryCode = code;
      fields.country.error = '';
    }
  };

  let formError = '';
  const submit = async () => {
    const errors = Object.keys(fields).reduce((all, field) => {
      const error = fields[field].validate(fields[field].value);
      fields[field].error = error || '';
      if (error) all.push(error);
      return all;
    }, []);

    const error = validateCountry(fields.country.value);
    if (error) errors.push(error);

    fields = fields;
    if (errors.length > 0) {
      console.log(errors);
      return;
    }

    try {
      await register({
        email: fields.email.value,
        password: fields.password.value,
        firstName: fields.firstName.value,
        lastName: fields.lastName.value,
        countryCode
      });
      notify.success($_('register.notify.successful'), 10000);
      goto(routes.MAP);
    } catch (err) {
      isRegistering.set(false);
      if (err.code === 'auth/email-already-in-use') formError = $_('register.notify.in-use');
      else formError = $_('register.notify.unexpected', { values: { support: SUPPORT_EMAIL } });
      console.log(err);
    }
  };

  const cookiePolicy = `<a class="link" href=${
    routes.COOKIE_POLICY
  } target="_blank"  rel="noreferrer" >${$_('generics.cookie-policy').toLocaleLowerCase()}</a>`;
  const privacyPolicy = `<a class="link" href=${
    routes.PRIVACY_POLICY
  } target="_blank"  rel="noreferrer" >${$_('generics.privacy-policy').toLocaleLowerCase()}</a>`;
  const termsOfUse = `<a class="link" href=${
    routes.TERMS_OF_USE
  } target="_blank"  rel="noreferrer" >${$_('generics.terms-of-use').toLocaleLowerCase()}</a>`;
</script>

<svelte:head>
  <title>{$_('register.title')} | Welcome To My Garden</title>
</svelte:head>

<Progress active={$isRegistering} />

<AuthContainer>
  <span slot="title">{$_('register.title')}</span>

  <form on:submit|preventDefault={submit} slot="form">
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
      <label for="email">{$_('generics.email')}l</label>
      <TextInput
        icon={emailIcon}
        autocomplete="email"
        type="email"
        name="email"
        id="email"
        on:blur={() => {
          fields.email.error = '';
        }}
        error={fields.email.error}
        bind:value={fields.email.value}
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
        bind:value={fields.password.value}
      />
    </div>

    <div>
      <label for="country">{$_('register.country')}</label>
      <TextInput
        autocomplete="country"
        icon={flagIcon}
        list="countries"
        name="country-list"
        on:blur={() => validateCountry(fields.country.value)}
        error={fields.country.error}
        bind:value={fields.country.value}
      />
      <datalist id="countries">
        {#each Object.keys(countries) as code}
          <option data-value={code}>{countries[code]}</option>
        {/each}
      </datalist>
      <input
        type="hidden"
        name="country"
        id="country-hidden"
        value={countryCode}
        bind:this={countryInput}
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

  .checkbox label {
    margin-left: 0.8rem;
  }
</style>
