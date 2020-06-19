<script>
  import { goto } from '@sveltech/routify';
  import { register } from '@/api/auth';
  import { isRegistering } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { countries } from '@/util';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput } from '@/components/UI';
  import { lockIcon, emailIcon } from '@/images/icons';

  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';

  let countryInput;

  const onCountryChange = e => {
    const { value } = e.currentTarget;
    // countryInput.value = countryName;
    const code = Object.keys(countries).find(key => countries[key] === value);
    if (code) countryInput.value = code;
  };

  const submit = async () => {
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
    }
  };
</script>

<svelte:head>
  <title>Sign up | Welcome To My Garden</title>
</svelte:head>

<AuthContainer>
  <span slot="title">Sign Up</span>

  <form on:submit|preventDefault={submit}>
    <label for="first-name">First name</label>
    <TextInput type="text" name="first-name" id="first-name" bind:value={firstName} />

    <label for="last-name">Last name</label>
    <TextInput type="text" name="last-name" id="last-name" bind:value={lastName} />

    <label for="email">Email</label>
    <TextInput type="email" name="email" id="email" bind:value={email} />

    <label for="password">Password</label>
    <TextInput type="password" name="password" id="password" bind:value={password} />

    <label for="country">Country</label>
    <TextInput list="countries" id="country" on:change={onCountryChange} autocomplete="off" />
    <datalist id="countries">
      {#each Object.keys(countries) as code}
        <option data-value={code}>{countries[code]}</option>
      {/each}
    </datalist>
    <input type="hidden" name="country" id="country-hidden" bind:this={countryInput} />

    <button type="submit" isLoading={isRegistering}>Sign up</button>
  </form>

  <p>
    Already have an account?
    <a href={routes.SIGN_IN}>Sign in</a>
  </p>
</AuthContainer>

<style>
  input {
    margin-bottom: 2rem;
  }
</style>
