<script lang="ts">
  import { Button, Modal, TextInput, Text } from '$lib/components/UI';
  import { _ } from 'svelte-i18n';
  import notify from '$lib/stores/notification';
  import {
    EmailAuthCredential,
    EmailAuthProvider,
    reauthenticateWithCredential
  } from 'firebase/auth';
  import { deleteAccount } from '$lib/api/auth';
  import { fade } from 'svelte/transition';
  import { getUser } from '$lib/stores/auth';
  import { auth } from '$lib/api/firebase';
  import isFirebaseError from '$lib/util/types/isFirebaseError';
  export let showAccountDeletionModal = false;

  let formError: null | string = null;
  let shouldReauthenticate = false;
  $: verificationPrompt = $_('account.delete.modal.prompt');

  let verificationField = '';
  $: processedVerificationField = verificationField.toLowerCase().trim();
  let password = '';

  const executeDeletion = async () => {
    await deleteAccount();
    notify.success($_('account.delete.modal.deleted'));
  };

  const onConfirmDeletion = async () => {
    if (processedVerificationField !== verificationPrompt) {
      formError = $_('account.delete.modal.errors.wrong-verification', {
        values: {
          prompt: verificationPrompt
        }
      });
      return;
    }

    if (shouldReauthenticate) {
      // If we previously had a reauthentication error
      const currentUser = auth().currentUser;

      if (currentUser) {
        const credential = EmailAuthProvider.credential(getUser().email, password);
        try {
          await reauthenticateWithCredential(currentUser, credential);
          await executeDeletion();
          shouldReauthenticate = false;
        } catch (e) {
          if (isFirebaseError(e) && e.code === 'auth/wrong-password') {
            formError = $_('account.delete.modal.reauthentication-incorrect-password');
          } else {
            formError = $_('sign-in.notify.login-issue');
          }
        }
      }
      return;
    }

    // the onIdTokenChanged handler will take care of logging out
    try {
      // To test the reauthentication, uncomment the following code, which simulates
      // the Firebase error we expect in this case.
      // The IIFE will prevent eslint from detecting unreachable code (but the ts language server is smart enough!)
      // ---------
      // (() => {
      //   throw { code: 'auth/requires-recent-login', name: 'something' };
      // })();
      // ---------
      await executeDeletion();
    } catch (e) {
      // https://stackoverflow.com/a/44247399/4973029
      if (isFirebaseError(e) && e.code === 'auth/requires-recent-login') {
        shouldReauthenticate = true;
      }
    }
  };
</script>

<Modal
  bind:show={showAccountDeletionModal}
  maxWidth="700px"
  radius={true}
  center={true}
  stickToBottom={false}
  nopadding={false}
  ariaLabelledBy="title"
>
  <div slot="title" class="title-section">
    <h2 id="gardenFilterTitle">{$_('account.delete.modal.title')}</h2>
  </div>
  <div slot="body" class="main-section">
    <form on:submit|preventDefault={onConfirmDeletion}>
      <div>
        <!-- TODO: add verification icon? -->
        <!-- icon={emailIcon} -->
        {@html $_('account.delete.modal.are-you-sure', {
          values: {
            unlist: $_('account.garden.listed.text')
          }
        })}

        {#if processedVerificationField !== verificationPrompt}
          <div class="verification">
            {@html $_('account.delete.modal.verification-info', {
              values: {
                prompt: verificationPrompt
              }
            })}
            <label for="verification"
              >{$_('account.delete.modal.delete-field-label', {
                values: {
                  prompt: verificationPrompt
                }
              })}</label
            >
            <TextInput
              name="verification"
              id="verification"
              placeholder={`${verificationPrompt.substring(0, 1)}...`}
              bind:value={verificationField}
            />
          </div>
        {:else if !shouldReauthenticate}
          <div class="verification">
            <p>{$_('account.delete.modal.verification-ok')}</p>
          </div>
        {/if}
        {#if shouldReauthenticate}
          <div class="verification">
            <p class="reauthentication-info">
              {@html $_('account.delete.modal.reauthentication-info')}
            </p>
            <label for="password">{$_('generics.password')}</label>
            <TextInput type="password" name="password" id="password" bind:value={password} />
          </div>
        {/if}
      </div>
      <div class="hint">
        {#if formError}
          <p transition:fade class="hint danger">{formError}</p>
        {/if}
      </div>
    </form>
  </div>
  <div slot="controls" class="applyGardenFilter">
    <Button
      disabled={processedVerificationField !== verificationPrompt}
      danger
      uppercase
      small
      on:click={onConfirmDeletion}>Delete account</Button
    >
  </div>
</Modal>

<style>
  label {
    font-weight: 500;
    margin-bottom: 0.5rem;
    display: block;
  }

  .verification {
    padding: 1rem;
    background-color: var(--color-beige-light);
    border-radius: var(--modal-border-radius);
  }

  .main-section :global(p) {
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .reauthentication-info {
    margin-top: 1rem;
  }
</style>
