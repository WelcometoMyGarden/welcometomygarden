<script lang="ts">
  import { manageEmailPreferences } from '$lib/api/functions';
  import Spinner from '$lib/components/UI/Spinner.svelte';
  import type { EmailPreferences } from '$lib/models/User';
  import { user } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { Button } from '$lib/components/UI';
  import { updateMailPreferences } from '$lib/api/user';
  import { logout } from '$lib/api/auth';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { supportEmailLinkString, trackEvent } from '$lib/util';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import * as Sentry from '@sentry/sveltekit';

  let formIsLoading = true;
  let secretParam: string | null = null;
  let emailParam: string | null = null;
  let error: string | null = null;
  let emailPreferences: EmailPreferences | null = null;

  $: hasAuthForEmail = ($user && !emailParam) || ($user && emailParam === $user.email);

  onMount(async () => {
    // Initialize
    // NOTE: this will not handle user switches well (log outs etc)
    const searchParams = new URLSearchParams(document.location.search);
    // TODO: Sendgrid doesn't seem to URL-encode Custom Unsubscribe links; at least for transactional ones
    // Assume that a space in the email was meant to be a "+". There may be more issues coming from this...
    // Maybe we can use the WTMG-ID instead?
    emailParam = (searchParams.get('email') || searchParams.get('e'))?.replace(/\s/g, '+') ?? null;
    secretParam = searchParams.get('secret') || searchParams.get('s');
    if (hasAuthForEmail) {
      // If there is a user, a reactive statement below will fill in emailPreferences
      emailParam = $user?.email!;
      emailPreferences = $user!.emailPreferences!;
    } else if ($user && emailParam !== $user.email) {
      // TODO: if another email parameter is detected than the logged-in user's email, do log out and refresh?
      await logout();
      // refresh
      window.location.reload();
    } else if (!$user && emailParam && secretParam) {
      // Else, if we have email+secret auth, load the preferences from the backend.
      const { data } = await manageEmailPreferences({
        type: 'get',
        email: emailParam,
        secret: secretParam
      });
      if (data.status === 'ok') {
        emailPreferences = data.emailPreferences;
      }
    } else {
      error = 'no-auth';
    }
    formIsLoading = false;
  });

  // Sync live with the account page if possible
  $: if ($user) {
    emailPreferences = $user.emailPreferences;
  }

  let isSubmittingPreferences = false;
  async function submitPreferences() {
    isSubmittingPreferences = true;
    if (!emailPreferences) {
      // Shouldn't happen
      error = 'loading-error';
      return;
    }
    emailPreferences.news = !emailPreferences?.news;
    try {
      if (hasAuthForEmail) {
        await updateMailPreferences('news', emailPreferences!.news);
      } else if (emailParam && secretParam) {
        const { data } = await manageEmailPreferences({
          type: 'set',
          emailPreferences: emailPreferences!,
          email: emailParam,
          secret: secretParam
        });
        if (data.status === 'error') {
          error = data.error;
        } else {
          trackEvent(
            emailPreferences.news
              ? PlausibleEvent.EMAIL_RESUBSCRIBE
              : PlausibleEvent.EMAIL_UNSUBSCRIBE,
            {
              list: 'newsletter'
            }
          );
        }
      }
    } catch (e) {
      error = 'Something went wrong';
      Sentry.captureException(e, { extra: { context: 'Updating email prefs (dedicated page)' } });
    }

    isSubmittingPreferences = false;
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
  {#if formIsLoading}
    <title>Email preferences</title>
  {:else if emailPreferences?.news}
    <title>
      {$_('email-preferences.unsubscribe.title')}
    </title>
  {:else}
    <title>
      {$_('email-preferences.resubscribe.title')}
    </title>
  {/if}
</svelte:head>

<AuthContainer>
  <span slot="title">
    {#if !error}
      {#if formIsLoading || emailPreferences?.news}
        {$_('email-preferences.unsubscribe.title')}
      {:else}
        {$_('email-preferences.resubscribe.title')}
      {/if}
    {:else}
      {$_('generics.error.start')}
    {/if}
  </span>
  <div class="email-prefs" slot="form">
    {#if formIsLoading}
      <p>{$_('payment-superfan.payment-section.loading')} <Spinner /></p>
    {:else if !emailPreferences || error}
      <p>
        {@html $_('email-preferences.error', {
          values: {
            support: supportEmailLinkString
          }
        })}
      </p>
    {:else if emailPreferences}
      {#if emailPreferences.news}
        {@html $_('email-preferences.unsubscribe.description', {
          values: { email: emailParam }
        })}
      {:else}
        {@html $_('email-preferences.resubscribe.description', {
          values: { email: emailParam }
        })}
      {/if}
      <div class="submit">
        <Button small uppercase on:click={submitPreferences} disabled={isSubmittingPreferences}
          >{#if emailPreferences.news}
            {$_('email-preferences.unsubscribe.unsubscribe')}
          {:else}
            {$_('email-preferences.resubscribe.resubscribe')}
          {/if}</Button
        >
      </div>
    {/if}
  </div>
</AuthContainer>

<style>
  .email-prefs :global(p) {
    margin-bottom: 2rem;
  }

  .submit {
    margin-top: 3.5rem;
    text-align: center;
  }
</style>
