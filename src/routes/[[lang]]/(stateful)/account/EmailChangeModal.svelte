<script lang="ts">
  import { requestEmailChange } from '$lib/api/functions';
  import { Modal, TextInput } from '$lib/components/UI';
  import Button from '$lib/components/UI/Button.svelte';
  import { MOBILE_BREAKPOINT } from '$lib/constants';
  import { getUser } from '$lib/stores/auth';
  import validateEmail from '$lib/util/validate-email';
  import { _ } from 'svelte-i18n';
  import { fade } from 'svelte/transition';
  import type { LocalizedMessage } from '$lib/util/translation-helpers';
  import EmailInput from '$lib/components/UI/EmailInput.svelte';

  interface Props {
    show?: boolean;
    newEmail?: string;
    success?: boolean;
    isLoading?: boolean;
  }

  let {
    show = $bindable(false),
    newEmail = $bindable(''),
    success = $bindable(false),
    isLoading = $bindable(false)
  }: Props = $props();
  let formError = $state<LocalizedMessage | null>(null);
  let isValidEmail = $derived(validateEmail(newEmail));

  const submitEmailChange = async () => {
    // TODO: use generalized email validation like in other components
    if (isValidEmail && newEmail !== getUser().email) {
      // It's valid and new email address
      try {
        isLoading = true;
        formError = null;
        await requestEmailChange(newEmail);
        success = true;
      } catch (e) {
        formError = { key: 'account.change-email.modal.error.firebase-error' };
      } finally {
        isLoading = false;
      }
    }
  };
</script>

<!-- TODO: for semantic HTML, should all Modals be refactored to have an optional <form> parent above all slots? -->

<Modal
  bind:show
  maxWidth="{MOBILE_BREAKPOINT}px"
  center={true}
  stickToBottom={false}
  nopadding={false}
  ariaLabelledBy="title"
>
  {#snippet title()}
    <div class="title-section">
      <h2>{$_('account.change-email.modal.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="email-change-body">
      {#if !success}
        <p>{$_('account.change-email.modal.info')}</p>
        <EmailInput
          labelKey="account.change-email.modal.new-email-label"
          name="new-email"
          id="new-email"
          placeholder={$_('account.change-email.modal.new-email-placeholder')}
          bind:value={newEmail}
        ></EmailInput>
        <div class="hint">
          {#if formError}
            <p transition:fade class="hint danger">{$_(formError.key, formError.options)}</p>
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
  {/snippet}
  {#snippet controls()}
    <div>
      {#if !success}
        <Button
          disabled={!isValidEmail || isLoading}
          uppercase
          small
          type="submit"
          onclick={submitEmailChange}>{$_('account.change-email.modal.button-label')}</Button
        >
      {/if}
    </div>
  {/snippet}
</Modal>

<style>
  .email-change-body :global(label) {
    font-weight: 500;
    display: block;
    margin-top: 1rem;
  }
</style>
