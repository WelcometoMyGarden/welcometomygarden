<script>
  import { register, isRegistering } from '../data/auth';
  import { countries } from '../util';

  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';

  const submit = async () => {
    try {
      const response = await register(email, password);
      console.log(response);
    } catch (err) {
      console.log(err);
    }
  };
</script>

<svelte:head>
  <title>Sign up | Welcome to my Garden</title>
</svelte:head>

<h1 class="text-xs-center">Sign up</h1>

<p>
  <a href="/login">Have an account?</a>
</p>

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
  <input list="countries" id="country" />
  <datalist id="countries">
    {#each Object.keys(countries) as countryCode (countryCode)}
      <option value={countryCode}>{countries[countryCode]}</option>
    {/each}
  </datalist>

  <button type="submit" isLoading={isRegistering}>Sign up</button>
</form>

<style>
  label {
    display: block;
  }
  input {
    margin-bottom: 1rem;
  }
</style>
