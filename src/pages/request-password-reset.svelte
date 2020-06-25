<script>
  import { fade } from 'svelte/transition';
  import AuthContainer from '@/components/AuthContainer.svelte';
  import { TextInput, Progress, Button } from '@/components/UI';
  import { emailIcon } from '@/images/icons';
  import { requestPasswordReset } from '@/api/auth';

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
  <title>Set a new password | Welcome To My Garden</title>
</svelte:head>

<Progress active={isSending} />

<AuthContainer>
  <span slot="title">Set a new password</span>
  <div slot="form">
    {#if !done}
      <p class="description">
        If you submit the form below, we can send you a unique link with which you can reset your
        password.
      </p>
      <form transition:fade on:submit|preventDefault={submit}>
        <div>
          <label for="email">Email</label>
          <TextInput
            icon={emailIcon}
            autocomplete="off"
            type="email"
            name="email"
            id="email"
            bind:value={email.value} />
        </div>
        <div class="submit">
          <Button type="submit" medium disabled={!email.value || isSending}>
            Email reset instructions
          </Button>
        </div>
      </form>
    {:else}
      <div transition:fade>
        <p>
          If an account with the email {email.value} exists, an email will now be sent with
          instructions on how to reset the password.
        </p>
        <p>
          Are you having trouble logging in? Contact
          <a class="link" href="mailto:support@welcometomygarden.org">
            support@welcometomygarden.org
          </a>
          and we'll help you out!
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
