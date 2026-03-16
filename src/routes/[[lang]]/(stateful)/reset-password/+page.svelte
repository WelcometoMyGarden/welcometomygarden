<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { password as validatePassword } from '$lib/util/validators';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/state';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import notify from '$lib/stores/notification';
  import { confirmPasswordReset, login, logout } from '$lib/api/auth';
  import { Progress, Button } from '$lib/components/UI';
  import routes from '$lib/routes';
  import { lr, type LocalizedMessage } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';
  import PasswordInput from '$lib/components/UI/PasswordInput.svelte';

  const oobCode = page.url.searchParams.get('oobCode');
  const email = page.url.searchParams.get('email');

  // Note: this page is the second stage of a flow starting on /auth/action.
  // The query parameters here are filled by that page.
  if (!email || !oobCode) {
    notify.danger($_('auth.invalid-code'));
    goto($lr(routes.HOME));
  }

  let password: { value?: string; error?: LocalizedMessage } = $state({});

  let isResetting = $state(false);
  const submit = async () => {
    isResetting = true;
    try {
      if (!oobCode || !email) {
        throw new Error('Invalid code');
      }

      // Validate password
      password.error = validatePassword(password.value);
      if (password.error || !password.value) {
        isResetting = false;
        return;
      }

      await confirmPasswordReset(oobCode, password.value);

      // if password reset was successful, sign user in:
      await logout();
      await login(email, password.value);
      notify.success($_('reset-password.success'));
      goto($lr(routes.MAP));
    } catch (err) {
      logger.log(err);
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
  {#snippet title()}
    <span>{$_('reset-password.title')}</span>
  {/snippet}

  {#snippet form()}
    <form
      class="password-reset-form"
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <PasswordInput
        autocomplete="new-password"
        bind:value={password.value}
        error={password.error}
      />
      <Button type="submit" medium>{$_('reset-password.update')}</Button>
    </form>
  {/snippet}
</AuthContainer>

<style>
  /* Ensure there is some spacing so it doesn't look weird in case of a validation error */
  .password-reset-form :global(.outer-container) {
    margin-bottom: 0.4rem;
  }
</style>
