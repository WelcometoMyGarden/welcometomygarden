<script>
  import { register } from '../api/auth';

  let email = '';
  let password = '';

  const submit = async () => {
    const response = await register({ email, password });

    if (response.user) {
      // TODO: save auth state
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
  <fieldset>
    <input type="text" placeholder="Email" bind:value={email} />
  </fieldset>
  <fieldset>
    <input type="password" placeholder="Password" bind:value={password} />
  </fieldset>
  <button>Sign up</button>
</form>
