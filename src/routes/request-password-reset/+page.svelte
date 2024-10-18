<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import AuthContainer from '$lib/components/AuthContainer.svelte';
  import { TextInput, Progress, Button } from '$lib/components/UI';
  import { emailIcon } from '$lib/images/icons';
  import { requestPasswordReset } from '$lib/api/functions';
  import { SUPPORT_EMAIL } from '$lib/constants';
  import { formEmailValue } from '$lib/stores/auth';

  let done = false;
  let isSending = false;
  const submit = async () => {
    isSending = true;
    try {
      await requestPasswordReset($formEmailValue);
      done = true;
      isSending = false;
    } catch (err) {
      done = true;
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
  <span slot="title">{$_('request-password-reset.title')}</span>
  <div slot="form">
    {#if !done}
      <p class="description">{$_('request-password-reset.description')}</p>
      <form transition:fade={{ duration: transitionDuration }} on:submit|preventDefault={submit}>
        <div>
          <label for="email">{$_('generics.email')}</label>
          <TextInput
            icon={emailIcon}
            autocomplete="off"
            type="email"
            name="email"
            id="email"
            bind:value={$formEmailValue}
          />
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
