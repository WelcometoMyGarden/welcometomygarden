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

  let formIsLoading = true;
  let secretParam: string | null = null;
  let emailParam: string | null = null;
  let originalEmailPreferences: EmailPreferences | null = null;
  let emailPreferences: EmailPreferences | null = null;

  $: hasAuthForEmail = ($user && !emailParam) || ($user && emailParam === $user.email);

  onMount(async () => {
    // Initialize
    // NOTE: this will not handle user switches well (log outs etc)
    const searchParams = new URLSearchParams(document.location.search);
    emailParam = searchParams.get('email');
    secretParam = searchParams.get('secret');
    if (hasAuthForEmail) {
      // If there is a user, a reactive statement below will fill in emailPreferences
      emailParam = $user?.email!;
      emailPreferences = $user!.emailPreferences!;
      originalEmailPreferences = { ...emailPreferences };
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
        originalEmailPreferences = { ...emailPreferences };
      }
    }
    formIsLoading = false;
  });

  let submittingPreferences = false;
  async function submitPreferences() {
    submittingPreferences = true;
    let error;
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
        }
      }
    } catch (e) {
      error = 'Something went wrong';
    }

    if (!error) {
      // TODO notify of success
    } else {
      // TODO notify of error
    }
    submittingPreferences = false;
  }
</script>

<svelte:head>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="wrapper">
  <div class="content">
    <h2 class="h2">{$_('account.preferences.title')} for {emailParam}</h2>
    <p>{$_('account.preferences.text')}</p>
    {#if formIsLoading}
      Loading <Spinner />
    {:else if !emailPreferences}
      Something went wrong. Contact support if this keeps happening
    {:else if emailPreferences}
      <ul class="preference-list">
        <li>
          <input type="checkbox" id="news" name="news" bind:checked={emailPreferences.news} />
          <label for="news">{$_('account.preferences.news')}</label>
        </li>
      </ul>
      <Button
        small
        uppercase
        fullWidth
        on:click={submitPreferences}
        disabled={submittingPreferences || originalEmailPreferences?.news === emailPreferences.news}
        >Save</Button
      >
    {/if}
  </div>
</div>

<style>
  .wrapper {
    min-height: calc(calc(var(--vh, 1vh) * 100) - var(--height-footer) - var(--height-nav) - 14rem);
    margin: var(--height-nav) auto 8rem auto;
    position: relative;
  }

  .content :global(.button) {
    max-width: 20rem;
    margin: auto;
  }

  .content {
    width: 60%;
    background-color: var(--color-white);
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    padding: 4rem;
    position: relative;
    max-width: 60rem;
    width: 100%;
    margin: auto;
  }

  .intro {
    margin-bottom: 1rem;
  }

  h2 {
    margin-bottom: 2rem;
    font-weight: 500;
    font-size: 1.8rem;
  }

  .preference-list {
    margin-bottom: 2rem;
    margin-top: 0.5rem;
    padding-left: 4rem;
  }
</style>
