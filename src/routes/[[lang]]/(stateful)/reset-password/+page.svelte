<script>
  import { _ } from 'svelte-i18n';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import notify from '$lib/stores/notification';
  import { confirmPasswordReset, login, logout } from '$lib/api/auth';
  import { TextInput, Progress, Button } from '$lib/components/UI';
  import { lockIcon } from '$lib/images/icons';
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';

  const oobCode = $page.url.searchParams.get('oobCode');
  const email = $page.url.searchParams.get('email');

  // Note: this page is the second stage of a flow starting on /auth/action.
  // The query parameters here are filled by that page.
  if (!email || !oobCode) {
    notify.danger($_('auth.invalid-code'));
    goto($lr(routes.HOME));
  }

  let password = {};

  let isResetting = false;
  const submit = async () => {
    isResetting = true;
    try {
      if (!oobCode || !email) {
        throw new Error('Invalid code');
      }

      await confirmPasswordReset(oobCode, password.value);

      // if password reset was successful, sign user in:
      await logout();
      await login(email, password.value);
      notify.success($_('reset-password.success'));
      goto($lr(routes.MAP));
    } catch (err) {
      console.log(err);
    }
    isResetting = false;
  };
</script>

<!-- @component a page to fill in a new password after a password change request was verified via email -->

<Progress active={isResetting} />

<svelte:head>
  <title>{$_('reset-password.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<AuthContainer>
  <span slot="title">{$_('reset-password.title')}</span>

  <form slot="form" on:submit|preventDefault={submit}>
    <label for="password">{$_('generics.password')}</label>
    <TextInput
      icon={lockIcon}
      type="password"
      name="password"
      id="password"
      autocomplete="new-password"
      bind:value={password.value}
    />
    <Button type="submit" medium>{$_('reset-password.update')}</Button>
  </form>
</AuthContainer>

<style>
  label {
    display: block;
  }
</style>
