<script>
  import { login } from '../api/auth';

  let email = '';
  let password = '';

  const submit = async () => {
    const response = await login(email, password);

    // TODO: Handle network errors and response errors

    if (response.user) {
      // TODO: ave auth state
    }
  };
</script>

<svelte:head>
  <title>Sign in | Welcome to my Garden</title>
</svelte:head>

<h1>Sign In</h1>
<p>
  <a href="/register">Need an account?</a>
</p>

<form on:submit|preventDefault={submit}>
  <fieldset>
    <input type="email" placeholder="Email" bind:value={email} />
  </fieldset>
  <fieldset>
    <input type="password" placeholder="Password" bind:value={password} />
  </fieldset>
  <button type="submit" disabled={!email || !password}>Sign in</button>
</form>
