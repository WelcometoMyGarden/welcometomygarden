<script>
  import { goto } from '@sveltech/routify';
  import { register } from '@/api/auth';
  import { isRegistering } from '@/stores/auth';
  import { countries } from '@/util';
  import routes from '@/routes';

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
      // TODO: show success
      $goto(routes.MAP);
    } catch (err) {
      console.log(err);
    }
  };
</script>

<svelte:head>
  <title>Sign up | Welcome to my Garden</title>
</svelte:head>

<h1>Sign up</h1>

<form on:submit|preventDefault={submit}>
  <label for="first-name">First name</label>
  <input type="text" name="first-name" id="first-name" bind:value={firstName} />

  <label for="last-name">Last name</label>
  <input type="text" name="last-name" id="last-name" bind:value={lastName} />

  <label for="email">Email</label>
  <input type="email" name="email" id="email" bind:value={email} />

  <label for="password">Password</label>
  <input type="password" name="password" id="password" bind:value={password} />

  <label for="country">Country</label>
  <input list="countries" id="country" on:change={onCountryChange} autocomplete="off" />
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

<style>
  label,
  button {
    display: block;
  }
  input {
    margin-bottom: 1rem;
  }
</style>
