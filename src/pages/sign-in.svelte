<script>
  import { goto } from '@sveltech/routify';
  import { user } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { login } from '@/api/auth';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput } from '@/components/UI';
  import { lockIcon, emailIcon } from '@/images/icons';

  let email = '';
  let password = '';

  const submit = async () => {
    try {
      await login(email, password);

      notify.success(`Welcome back, ${$user.firstName}!`);
      $goto(routes.MAP);
    } catch (ex) {
      // TODO: Handle network errors and response errors
      console.log(ex);
    }
  };
</script>

<svelte:head>
  <title>Sign in | Welcome to my Garden</title>
</svelte:head>

<AuthContainer>
  <span slot="title">Sign In</span>

  <form on:submit|preventDefault={submit}>
    <div>
      <TextInput type="email" placeholder="email" bind:value={email} icon={emailIcon} />
    </div>
    <div>
      <TextInput type="password" placeholder="password" bind:value={password} icon={lockIcon} />
    </div>
    <a href={routes.REQUEST_PASSWORD_RESET}>Reset your password</a>
    <button type="submit" disabled={!email || !password}>Sign in</button>
  </form>

  <p>
    Need an account?
    <a href={routes.REGISTER}>Register</a>
  </p>
</AuthContainer>
