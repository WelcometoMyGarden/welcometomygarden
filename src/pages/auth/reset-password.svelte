<script>
  import { goto, params } from '@sveltech/routify';
  import { confirmPasswordReset, login } from '../../data/auth';
  import routes from '../../routes';

  let password = '';

  const submit = async () => {
    try {
      await confirmPasswordReset($params.oobCode, password);

      // if password reset was sucessful, sign user in:
      await login($params.email, password);

      //TODO: display success
      $goto(routes.MAP);
    } catch (err) {
      console.log(err);
    }
  };
</script>

<svelte:head>
  <title>Sign up | Welcome to my Garden</title>
</svelte:head>

<h1>Set a new password</h1>

<form on:submit|preventDefault={submit}>
  <label for="password">Password</label>
  <input type="password" name="password" id="password" bind:value={password} />

  <button type="submit">Update password</button>
</form>

<style>
  label,
  button {
    display: block;
  }
  input {
    margin-bottom: 1rem;
  }
</style>
