<script>
  import { goto } from '@sveltech/routify';
  import { register } from '@/api/auth';
  import { isRegistering } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { countries } from '@/util';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Progress } from '@/components/UI';
  import { lockIcon, emailIcon, userIcon, flagIcon } from '@/images/icons';

  let email = {};
  let password = {};
  let firstName = {};
  let lastName = {};
  let country = {};

  let countryCode;
  let countryInput;

  const onCountryChange = e => {
    const { value } = e.currentTarget;
    // countryInput.value = countryName;
    const code = Object.keys(countries).find(key => countries[key] === value);
    if (code) countryCode = code;
    country.value = value;
    console.log(country, countryCode);
  };

  const submit = async event => {
    console.log(country);
    /*
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        countryCode: countryInput.value
      });
      notify.success(
        'Your account was created successfully! Please check your email to verify your account.',
        10000
      );
      $goto(routes.MAP);
    } catch (err) {
      console.log(err);
    } */
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
        bind:value={firstName.value} />
    </div>

    <div>
      <label for="last-name">Last name</label>
      <TextInput
        icon={userIcon}
        autocomplete="family-name"
        type="text"
        name="last-name"
        id="last-name"
        bind:value={lastName.value} />
    </div>

    <div>
      <label for="email">Email</label>
      <TextInput
        icon={emailIcon}
        autocomplete="email"
        type="email"
        name="email"
        id="email"
        bind:value={email.value} />
    </div>

    <div>
      <label for="password">Password</label>
      <TextInput
        icon={lockIcon}
        type="password"
        name="password"
        id="password"
        autocomplete="new-password"
        bind:value={password.value} />
    </div>

    <div>
      <label for="country">Country</label>
      <TextInput
        autocomplete="country"
        icon={flagIcon}
        list="countries"
        name="country-list"
        value={country.value}
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
      <button class="submit" type="submit" isLoading={$isRegistering}>Sign up</button>
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
</style>
