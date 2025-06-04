<script lang="ts">
  import { requestEmailChange } from '$lib/api/functions';
  import { Modal, TextInput } from '$lib/components/UI';
  import Button from '$lib/components/UI/Button.svelte';
  import { getUser } from '$lib/stores/auth';
  import validateEmail from '$lib/util/validate-email';
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';

  export let show = false;
  export let newEmail = '';
  export let success = false;
  export let isLoading = false;
  let formError: null | string = null;
  $: isValidEmail = validateEmail(newEmail);

  const submitEmailChange = async () => {
    if (isValidEmail && newEmail !== getUser().email) {
      // It's valid and new email address
      try {
        isLoading = true;
        await requestEmailChange(newEmail);
        success = true;
      } catch (e) {
        formError = $_('account.change-email.modal.error.firebase-error');
      } finally {
        isLoading = false;
      }
    }
  };
</script>

<!-- TODO: for semantic HTML, should all Modals be refactored to have an optional <form> parent above all slots? -->

<Modal
  bind:show
  maxWidth="700px"
  center={true}
  stickToBottom={false}
  nopadding={false}
  ariaLabelledBy="title"
>
  <div slot="title" class="title-section">
    <h2>{$_('account.change-email.modal.title')}</h2>
  </div>
  <div slot="body">
    {#if !success}
      <p>{$_('account.change-email.modal.info')}</p>
      <label for="new-email">{$_('account.change-email.modal.new-email-label')}</label>
      <TextInput
        name="new-email"
        id="new-email"
        placeholder={$_('account.change-email.modal.new-email-placeholder')}
        bind:value={newEmail}
      />
      <div class="hint">
        {#if formError}
          <p transition:fade class="hint danger">{formError}</p>
        {/if}
      </div>
    {:else}
      <p>
        {$_('account.change-email.modal.success', {
          values: {
            newEmail
          }
        })}
      </p>
    {/if}
  </div>
  <div slot="controls">
    {#if !success}
      <Button
        disabled={!isValidEmail || isLoading}
        uppercase
        small
        type="submit"
        on:click={submitEmailChange}>{$_('account.change-email.modal.button-label')}</Button
      >
    {/if}
  </div>
</Modal>

<style>
  label {
    font-weight: 500;
    display: block;
    margin-top: 1rem;
  }
</style>
