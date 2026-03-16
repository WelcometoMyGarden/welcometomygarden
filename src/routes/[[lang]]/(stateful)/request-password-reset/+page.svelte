<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { Progress, Button } from '$lib/components/UI';
  import { requestPasswordReset } from '$lib/api/functions';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import { formEmailValue } from '$lib/stores/auth';
  import { email as validateEmail } from '$lib/util/validators';
  import type { LocalizedMessage } from '$lib/util/translation-helpers';
  import * as Sentry from '@sentry/sveltekit';
  import EmailInput from '$lib/components/UI/EmailInput.svelte';

  let done = $state(false);
  let isSending = $state(false);
  let formError = $state<LocalizedMessage>();

  const submit = async () => {
    formError = validateEmail($formEmailValue);
    if (formError) {
      return;
    }
    isSending = true;
    try {
      await requestPasswordReset($formEmailValue);
      done = true;
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'Requesting password reset' } });
      done = true;
    } finally {
      isSending = false;
    }
  };
  // Coordinate the transition duration to prevent both stages to be visible at the same time.
  // See below.
  const transitionDuration = 300;
</script>

<svelte:head>
  <title>{$_('request-password-reset.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<Progress active={isSending} />

<AuthContainer>
  {#snippet title()}
    <span>{$_('request-password-reset.title')}</span>
  {/snippet}
  {#snippet form()}
    <div>
      {#if !done}
        <p class="description">{$_('request-password-reset.description')}</p>
        <form
          novalidate
          transition:fade={{ duration: transitionDuration }}
          onsubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div>
            <EmailInput bind:value={$formEmailValue} error={formError} autocomplete="off" />
          </div>
          <div class="submit">
            <Button type="submit" medium disabled={!$formEmailValue || isSending}>
              {$_('request-password-reset.button')}
            </Button>
          </div>
        </form>
      {:else}
        <div in:fade={{ delay: transitionDuration }}>
          <p>{$_('request-password-reset.set', { values: { email: $formEmailValue } })}</p>
          <p>
            {@html $_('request-password-reset.trouble', {
              values: {
                support: `<a class="link" href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`
              }
            })}
          </p>
        </div>
      {/if}
    </div>
  {/snippet}
</AuthContainer>

<style>
  .description {
    margin: 2rem 0;
  }
  form > div {
    margin-bottom: 1.2rem;
  }
  .submit {
    text-align: center;
    margin: 1rem 0;
  }
  p {
    margin: 2rem 0;
  }
</style>
