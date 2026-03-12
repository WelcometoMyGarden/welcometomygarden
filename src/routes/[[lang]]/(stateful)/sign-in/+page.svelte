<script>
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import {
    formEmailValue,
    formPasswordValue,
    isSigningIn,
    resolveOnUserLocaleLoaded,
    user
  } from '$lib/stores/auth';
  import notify from '$lib/stores/notification';
  import { login } from '$lib/api/auth';
  import routes from '$lib/routes';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { TextInput, Button, Progress } from '$lib/components/UI';
  import { lockIcon, emailIcon } from '$lib/images/icons';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import { page } from '$app/state';
  import { get } from 'svelte/store';
  import isFirebaseError from '$lib/util/types/isFirebaseError';
  import * as Sentry from '@sentry/sveltekit';
  import { lr } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';
  import { tick } from 'svelte';

  const continueUrl = $derived(page.url.searchParams.get('continueUrl'));

  let formError = $state('');
  const submit = async () => {
    if (!$formEmailValue || !$formPasswordValue) return;
    formError = '';
    try {
      Sentry.addBreadcrumb({ message: 'Attempt to log in', level: 'info' });
      await login($formEmailValue, $formPasswordValue);
      const localUser = get(user);
      if (!localUser) {
        logger.warn('User unexpectedly null in sign-in');
        Sentry.captureMessage('User unexpectedly null after login', {
          level: 'warning'
        });
      }
      await resolveOnUserLocaleLoaded();
      // Without this, the locale update won't be propagated to the formatter _ in notify yet, despite the resolveOnUserLocaleLoaded above
      await tick();
      notify.success($_('sign-in.notify.welcome', { values: { user: localUser?.firstName } }));
      // NOTE: don't handle redirects & goto here, they are handled by auth().onIdTokenChanged()
    } catch (ex) {
      if (
        isFirebaseError(ex) &&
        (ex.code === 'auth/user-not-found' || ex.code === 'auth/wrong-password')
      ) {
        formError = $_('sign-in.notify.incorrect');
        Sentry.captureMessage('Sign in failed - incorrect credentials', {
          level: 'info' // This is an expected error case
        });
      } else {
        formError = $_('sign-in.notify.login-issue', { values: { support: SUPPORT_EMAIL } });
        Sentry.captureException(ex, {
          extra: {
            isFirebaseError: isFirebaseError(ex),
            errorCode: isFirebaseError(ex) ? ex.code : undefined
          }
        });
      }
      // TODO: Handle network errors and response errors
    }
  };
</script>

<svelte:head>
  <title>{$_('sign-in.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={$isSigningIn} />

<AuthContainer>
  {#snippet title()}
    <span>{$_('sign-in.title')}</span>
  {/snippet}

  {#snippet form()}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div>
        <label for="email">{$_('generics.email')}</label>
        <TextInput
          icon={emailIcon}
          autocomplete="email"
          type="email"
          name="email"
          id="email"
          bind:value={$formEmailValue}
        />
      </div>
      <div>
        <label for="password">{$_('generics.password')}</label>
        <TextInput
          icon={lockIcon}
          type="password"
          name="password"
          id="password"
          autocomplete="new-password"
          bind:value={$formPasswordValue}
        />
      </div>
      <div class="hint">
        {#if formError}
          <p transition:fade class="hint danger">{formError}</p>
        {/if}
      </div>
      <div class="submit">
        <Button type="submit" medium disabled={!$formEmailValue || !$formPasswordValue}>
          {$_('sign-in.button')}
        </Button>
      </div>
    </form>
  {/snippet}

  <p>
    {@html $_('sign-in.reset.text', {
      values: {
        link: `<a class="link" href="${$lr(routes.REQUEST_PASSWORD_RESET)}">${$_(
          'sign-in.reset.link'
        )}</a>`
      }
    })}
  </p>
  <p>
    {@html $_('sign-in.register.text', {
      values: {
        link: `<a class="link" href="${$lr(routes.REGISTER)}${continueUrl ? `?continueUrl=${encodeURIComponent(continueUrl)}` : ''}">${$_('sign-in.register.link')}</a>`
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
