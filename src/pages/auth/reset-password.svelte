<script>
  // import { requestPasswordReset } from '../../data/auth';
  import { countries } from '../../util';
  import routes from '../../routes';

  let password = '';

  const submit = async () => {
    try {
      // const response = await requestPasswordReset(password);
      // console.log(response);
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
