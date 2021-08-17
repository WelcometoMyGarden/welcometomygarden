<script>
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Progress, Button } from '@/components/UI';
  import { emailIcon } from '@/images/icons';
  import { requestPasswordReset } from '@/api/auth';
  import { SUPPORT_EMAIL } from '@/constants';

  let email = {};
  let done = false;
  let isSending = false;
  const submit = async () => {
    isSending = true;
    try {
      await requestPasswordReset(email.value);
      done = true;
      isSending = false;
    } catch (err) {
      done = true;
      isSending = false;
    }
  };
</script>

<svelte:head>
  <title>{$_('request-password-reset.title')} | Welcome To My Garden</title>
</svelte:head>

<Progress active={isSending} />

<AuthContainer>
  <span slot="title">{$_('request-password-reset.title')}</span>
  <div slot="form">
    {#if !done}
      <p class="description">{$_('request-password-reset.description')}</p>
      <form transition:fade on:submit|preventDefault={submit}>
        <div>
          <label for="email">{$_('generics.email')}</label>
          <TextInput
            icon={emailIcon}
            autocomplete="off"
            type="email"
            name="email"
            id="email"
            bind:value={email.value}
          />
        </div>
        <div class="submit">
          <Button type="submit" medium disabled={!email.value || isSending}>
            {$_('request-password-reset.button')}
          </Button>
        </div>
      </form>
    {:else}
      <div transition:fade>
        <p>{$_('request-password-reset.set', { values: { email: email.value } })}</p>
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
