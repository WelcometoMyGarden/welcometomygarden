<script>
  import { requestPasswordReset } from '../../api/auth';

  let email = '';

  const submit = async () => {
    try {
      const response = await requestPasswordReset(email);
      console.log(response);
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
  <label for="email">Your email address</label>
  <input type="email" name="email" id="email" bind:value={email} />

  <button type="submit">Email reset instructions</button>
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
