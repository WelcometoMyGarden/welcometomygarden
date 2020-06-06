<script>
  import { register, isRegistering } from '../data/auth';
  import { PageContainer } from '../components/UI';

  let email = '';
  let password = '';

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
  <fieldset>
    <input type="text" placeholder="Email" bind:value={email} />
  </fieldset>
  <fieldset>
    <input type="password" placeholder="Password" bind:value={password} />
  </fieldset>
  <button isLoading={isRegistering}>Sign up</button>
</form>
