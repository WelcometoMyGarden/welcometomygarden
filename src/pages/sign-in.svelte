<script>
  import { fade } from 'svelte/transition';
  import { goto } from '@sveltech/routify';
  import { user } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { login } from '@/api/auth';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Button } from '@/components/UI';
  import { lockIcon, emailIcon } from '@/images/icons';

  let email = {};
  let password = {};

  let formError = '';
  const submit = async () => {
    formError = '';
    try {
      await login(email.value, password.value);
      notify.success(`Welcome back, ${$user.firstName}!`);
      $goto(routes.MAP);
    } catch (ex) {
      if (ex.code === 'auth/user-not-found' || ex.code === 'auth/wrong-password')
        formError = 'The provided email or password is incorrect.';
      else {
        formError =
          "We couldn't log you in. If the problem persists, please contact support@welcometomygarden.org";
      }
      // TODO: Handle network errors and response errors
    }
  };
</script>

<svelte:head>
  <title>Sign in | Welcome to my Garden</title>
</svelte:head>

<AuthContainer>
  <span slot="title">Sign In</span>

  <form slot="form" on:submit|preventDefault={submit}>
    <div>
      <label for="email">Email</label>
      <TextInput
        icon={emailIcon}
        autocomplete="email"
        type="email"
        name="email"
        id="email"
        bind:value={email.value} />
    </div>
    <div>
      <label for="password">Password</label>
      <TextInput
        icon={lockIcon}
        type="password"
        name="password"
        id="password"
        autocomplete="new-password"
        bind:value={password.value} />
    </div>
    <div class="hint">
      {#if formError}
        <p transition:fade class="hint danger">{formError}</p>
      {/if}
    </div>
    <div class="submit">
      <Button type="submit" medium disabled={!email.value || !password.value}>Sign in</Button>
    </div>
  </form>

  <p>
    Forgot your password?
    <a href={routes.REQUEST_PASSWORD_RESET} class="link">Reset it</a>
  </p>
  <p>
    Don't have an account yet?
    <a href={routes.REGISTER} class="link">Register</a>
  </p>
</AuthContainer>

<style>
  form > div {
    margin-bottom: 1.2rem;
  }

  .submit {
    text-align: center;
    margin: 1rem 0;
  }

  .hint {
    min-height: 3rem;
    margin-bottom: 0;
  }
</style>
