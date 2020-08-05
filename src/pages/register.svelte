<script>
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import { goto } from '@sveltech/routify';
  import { register } from '@/api/auth';
  import { isRegistering } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { countries } from '@/util';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Progress, Button } from '@/components/UI';
  import { lockIcon, emailIcon, userIcon, flagIcon } from '@/images/icons';

  let fields = {
    email: {
      validate: (v) => {
        if (!v) return 'Please add an email address, this is what you log in with!';
      }
    },
    password: {
      validate: (v) => {
        if (!v) return 'You need to set a password so you can log in later';
        if (v.length < 8) return 'Your password must be at least 8 characters';
        // Primarily to prevent password length denial of service
        if (v.length > 100) return 'Please make sure your password is at most 100 characters long';
      }
    },
    firstName: {
      validate: (v) => {
        if (!v)
          return "Please enter a first name. This is how you're shown to other users of WTMG.";
        if (v.length > 25)
          return 'Your first name can only be 25 characters long so we can display it properly. Feel free too abbreviate or choose a nickname!';
      }
    },
    lastName: {
      validate: (v) => {
        if (!v) return "Please enter your last name. This won't be shared with other users.";
      }
    },
    country: {
      validate: (v) => {
        if (!v)
          return "Please enter your country. This helps us focus the map on where you're from";
      }
    },
    consent: {
      value: false,
      validate: (v) => {
        if (!v)
          return "You must consent to Welcome To My Garden's terms if you want to use the platform";
      }
    }
  };
  let countryCode;
  let countryInput;

  const validateCountry = (v) => {
    const value = v ? v.toLowerCase() : v;
    const code = Object.keys(countries).find((key) => countries[key].toLowerCase() === value);
    if (!code) {
      const error = 'Please choose a country from the list';
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
    if (errors.length > 0) return;

    try {
      await register({
        email: fields.email.value,
        password: fields.password.value,
        firstName: fields.firstName.value,
        lastName: fields.lastName.value,
        countryCode
      });
      notify.success(
        'Your account was created successfully! Please check your email to verify your account.',
        10000
      );
      $goto(routes.MAP);
    } catch (err) {
      isRegistering.set(false);
      if (err.code === 'auth/email-already-in-use')
        formError = 'This email address is already in use.';
      else
        formError =
          'An unexpected error occurred. If the problem persists, please contact support@welcometomygarden.org';
      console.log(err);
    }
  };

  const cookiePolicy = `<a class="link" href=${routes.COOKIE_POLICY} target="_blank">
    ${$_('generics.cookie-policy')}</a>`;
  const privacyPolicy = `<a class="link" href=${routes.PRIVACY_POLICY} target="_blank">${$_(
    'generics.privacy-policy'
  )},</a>`;
  const termsOfUse = `<a class="link" href=${routes.TERMS_OF_USE} target="_blank">${$_(
    'generics.terms-of-use'
  )},</a>`;
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
        bind:value={fields.firstName.value} />
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
        bind:value={fields.lastName.value} />
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
        bind:value={fields.email.value} />
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
        bind:value={fields.password.value} />
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
        bind:value={fields.country.value} />
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
        bind:this={countryInput} />
    </div>
    <div class="consent">
      <div class="checkbox">
        <input type="checkbox" id="terms" name="terms" bind:checked={fields.consent.value} />
<!--         <label for="terms">
          I agree to the
          <a class="link" href={routes.COOKIE_POLICY} target="_blank">cookie policy,</a>
          <a class="link" href={routes.PRIVACY_POLICY} target="_blank">privacy policy</a>
          and
          <a class="link" href={routes.TERMS_OF_USE} target="_blank">terms of use</a>
        </label> -->
        <label for="terms">
          {@html $_('register.country', {
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
        <p class="mt-m mb-m">Signing you up...</p>
      {/if}
      <p>
        Already have an account?
        <a class="link" href={routes.SIGN_IN}>Sign in</a>
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
