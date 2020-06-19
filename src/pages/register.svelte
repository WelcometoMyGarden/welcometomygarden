<script>
  import { fade } from 'svelte/transition';
  import { goto } from '@sveltech/routify';
  import { register } from '@/api/auth';
  import { isRegistering } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { countries } from '@/util';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Progress } from '@/components/UI';
  import { lockIcon, emailIcon, userIcon, flagIcon } from '@/images/icons';

  let fields = {
    email: {
      validate: v => {
        if (!v) return 'Please add an email address, this is what you log in with!';
      }
    },
    password: {
      validate: v => {
        if (!v) return 'You need to set a password so you can log in later';
        if (v.length < 8) return 'Your password must be at least 8 characters';
        // Primarily to prevent password length denial of service
        if (v.length > 100) return 'Please make sure your password is at most 100 characters long';
      }
    },
    firstName: {
      validate: v => {
        if (!v)
          return "Please enter a first name. This is how you're shown to other users of WTMG.";
      }
    },
    lastName: {
      validate: v => {
        if (!v) return "Please enter your last name. This won't be shared with other users.";
      }
    },
    country: {
      validate: v => {
        if (!v)
          return "Please enter your country. This helps us focus the map on where you're from";
      }
    }
  };
  let countryCode;
  let countryInput;

  const onCountryChange = e => {
    const { value } = e.currentTarget;
    // countryInput.value = countryName;
    const code = Object.keys(countries).find(key => countries[key] === value);
    if (code) countryCode = code;
    fields.country.value = value;
  };

  let formError = '';
  const submit = async () => {
    const errors = Object.keys(fields).reduce((all, field) => {
      const error = fields[field].validate(fields[field].value);
      fields[field].error = error || '';
      if (error) all.push(error);
      return all;
    }, []);

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
</script>

<svelte:head>
  <title>Sign up | Welcome To My Garden</title>
</svelte:head>

<Progress active={$isRegistering} />

<AuthContainer>
  <span slot="title">Sign Up</span>

  <form on:submit|preventDefault={submit} slot="form">
    <div>
      <label for="first-name">First name</label>
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
      <label for="last-name">Last name</label>
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
      <label for="email">Email</label>
      <TextInput
        icon={emailIcon}
        autocomplete="email"
        type="email"
        name="email"
        id="email"
        on:blur={() => (fields.email.error = '')}
        error={fields.email.error}
        bind:value={fields.email.value} />
    </div>

    <div>
      <label for="password">Password</label>
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
      <label for="country">Country</label>
      <TextInput
        autocomplete="country"
        icon={flagIcon}
        list="countries"
        name="country-list"
        on:blur={() => (fields.country.error = '')}
        error={fields.country.error}
        value={fields.country.value}
        on:input={onCountryChange} />
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

    <div class="submit">
      <div class="hint">
        {#if formError}
          <p transition:fade class="hint danger">{formError}</p>
        {/if}
      </div>
      <button class="submit" type="submit" disabled={$isRegistering} isLoading={$isRegistering}>
        Sign up
      </button>
    </div>
  </form>

  <p>
    Already have an account?
    <a class="link" href={routes.SIGN_IN}>Sign in</a>
  </p>
</AuthContainer>

<style>
  form > div {
    margin-bottom: 1.2rem;
  }

  .submit {
    text-align: center;
  }

  .hint {
    min-height: 3rem;
    margin-bottom: 0;
  }
</style>
