<script>
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import { goto } from '@sveltech/routify';
  import { user } from '@/stores/auth';
  import notify from '@/stores/notification';
  import { login } from '@/api/auth';
  import routes from '@/routes';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Button } from '@/components/UI';
  import { lockIcon, emailIcon } from '@/images/icons';
  import { SUPPORT_EMAIL } from '@/constants';

  let email = {};
  let password = {};

  let formError = '';
  const submit = async () => {
    if (!email.value || !password.value) return;
    formError = '';
    try {
      await login(email.value, password.value);
      notify.success(`${$_('sign-in.notify.welcome')}, ${$user.firstName}!`);
      $goto(routes.MAP);
    } catch (ex) {
      if (ex.code === 'auth/user-not-found' || ex.code === 'auth/wrong-password')
        formError = $_('sign-in.notify.incorrect');
      else {
        formError = $_('sign-in.notify.login-issue', { values: { support: SUPPORT_EMAIL } });
      }
      // TODO: Handle network errors and response errors
    }
  };
</script>

<svelte:head>
  <title>{$_('sign-in.title')} | Welcome To My Garden</title>
</svelte:head>

<AuthContainer>
  <span slot="title">{$_('sign-in.title')}</span>

  <form slot="form" on:submit|preventDefault={submit}>
    <div>
      <label for="email">{$_('generics.email')}</label>
      <TextInput
        icon={emailIcon}
        autocomplete="email"
        type="email"
        name="email"
        id="email"
        bind:value={email.value} />
    </div>
    <div>
      <label for="password">{$_('generics.password')}</label>
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
      <Button type="submit" medium disabled={!email.value || !password.value}>
        {$_('sign-in.button')}
      </Button>
    </div>
  </form>

  <p>
    {@html $_('sign-in.reset.text', {
      values: {
        link: `<a class="link" href="${routes.REQUEST_PASSWORD_RESET}">${$_('sign-in.reset.link')}</a>`
      }
    })} 
  </p>
  <p>
    {@html $_('sign-in.register.text', {
      values: {
        link: `<a class="link" href="${routes.REGISTER}">${$_('sign-in.register.link')}</a>`
      }
    })}    
  </p>
</AuthContainer>

<style>
  form > div {
    margin-bottom: 1.2rem;
  }

  form {
    margin-bottom: 2rem;
  }

  .submit {
    text-align: center;
    margin: 1rem 0;
  }

  .hint {
    margin-bottom: 0;
  }
</style>
