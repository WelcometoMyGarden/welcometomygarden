<script>
  import { login, isLoggingIn } from '../../data/auth';
  import routes from '../../routes';

  let email = '';
  let password = '';

  const submit = async () => {
    try {
      await login(email, password);
    } catch (ex) {
      // TODO: Handle network errors and response errors
      console.log(ex);
    }
  };
</script>

<svelte:head>
  <title>Sign in | Welcome to my Garden</title>
</svelte:head>

<h1>Sign In</h1>

<form on:submit|preventDefault={submit}>
  <fieldset>
    <input type="email" placeholder="Email" bind:value={email} />
  </fieldset>
  <fieldset>
    <input type="password" placeholder="Password" bind:value={password} />
  </fieldset>
  <fieldset>
    <input type="password" placeholder="Password" bind:value={password} />
    <a href={routes.RESET_PASSWORD}>Reset your password</a>
  </fieldset>
  <p />
  <button type="submit" disabled={!email || !password}>Sign in</button>
</form>

<p>
  Need an account?
  <a href={routes.REGISTER}>Register</a>
</p>
