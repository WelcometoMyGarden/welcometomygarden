<script lang="ts">
  // This page is set up according to the instructions here:
  // https://firebase.google.com/docs/auth/custom-email-handler#link_to_your_custom_handler_in_your_email_templates
  //
  // It does NOT yet seem to be possible to set a custom handler URL for the local auth emulator: that one handles verifications internally with URLs of the form:
  // http://127.0.0.1:9099/emulator/action?mode=verifyEmail&lang=en&oobCode=EkpfDbT1x6s2Odi2hwAzJtW6dmoWX9BXjRWE96VWUrxXxgmbW7H-CW&apiKey=fake-api-key&continueUrl=http%3A%2F%2Flocalhost%3A5173%2Faccount
  // At the time of writing, someone submitted a PR for this though: https://github.com/firebase/firebase-tools/pull/5360
  // It IS possible to test this page locally  by taking local auth email verification URLs of the form
  // pasting the query string ?... bit of the above URL after http://localhost:5173/auth/action manually.
  //
  // In the demo, when the page /account continueUrl is loaded:
  // The onIdTokenChanged in auth.ts will get notified that the email address was verified, but only when it is
  // in a tab on the same window (https://github.com/WelcometoMyGarden/welcometomygarden/issues/297).
  // It will detect that email_verified is not yet true as a token claim, and will force-reset the token.
  // The force-reset triggers idTokenChanged everywhere.
  import { _ } from 'svelte-i18n';
  import { resolveOnUserLoaded, user } from '@/lib/stores/auth';
  import { goto } from '$lib/util/navigate';
  import { page } from '$app/stores';
  import routes from '$lib/routes';
  import notify from '$lib/stores/notification';
  import {
    verifyPasswordResetCode,
    applyActionCode,
    isEmailVerifiedAndTokenSynced
  } from '@/lib/api/auth';
  import { auth } from '@/lib/api/firebase';
  import PaddedSection from '@/routes/(marketing)/_components/PaddedSection.svelte';
  import { get } from 'svelte/store';

  let loadingState = '';

  const mode = $page.url.searchParams.get('mode');
  // https://firebase.google.com/docs/auth/custom-email-handler
  // oobCode = "A one-time code, used to identify and verify a request"
  const oobCode = $page.url.searchParams.get('oobCode');

  // Determine the path of the continueUrl
  // It must be on the same host as this page.
  // So far, this is not used, but this adds support for when we want to use it.
  const continueUrl = $page.url.searchParams.get('continueUrl');
  const continueUrlPathMatch = /https?:\/\/[^/]+(\/.*$)/.exec(continueUrl ?? '');
  let gotoPath: string | null = null;
  if (continueUrlPathMatch) {
    gotoPath = continueUrlPathMatch[1];
  }

  if (!mode || !oobCode) {
    notify.danger($_('auth.invalid-code'));
    goto(routes.HOME);
  }

  const handleAction = async () => {
    if (!mode || !oobCode) {
      throw new Error('Invalid code');
    }
    if (mode === 'resetPassword') {
      try {
        const email = await verifyPasswordResetCode(oobCode);
        let query = new URLSearchParams();
        query.set('mode', mode);
        query.set('oobCode', oobCode);
        query.set('email', email);
        goto(routes.RESET_PASSWORD + `?${query.toString()}`);
      } catch (ex) {
        notify.danger($_('auth.password.expired'), 15000);
        goto(routes.REQUEST_PASSWORD_RESET);
      }
    }

    if (mode === 'verifyEmail') {
      try {
        // Try verifying the email
        console.log('Verification: applying oobCode');

        loadingState = $_('auth.verification.verifying');
        // applyActionCode DOES NOT trigger idTokenChanged
        await applyActionCode(oobCode);

        // Wait until the user is fully loaded, if it is not yet.
        await resolveOnUserLoaded();
        console.log('Verification: Reloading user to trigger idTokenChanged');
        if (get(user)) {
          loadingState = $_('auth.verification.reloading');
          // TODO: an edge case we're not handling here:
          // if you're logged in into a different account from the
          // account that you are verifying.

          // If we're logged in, reload the user.
          //
          // The .reload() call triggers an idTokenChanged event.
          // We don't need to force-reload the token here, idTokenChanged
          // will take care of that.
          await auth().currentUser?.reload();

          // Success handling is done by idTokenChanged in auth.ts

          // Note: it is not guaranteed here that the verification was fully synced to the token yet.
          // In that case, we consider the account email as unverified locally.
          // Thus, to prevent confusion with the "Resend Verification" button,
          // we don't immediately redirect to /account here
          // idTokenChanged will do the redirection.
          if (gotoPath && gotoPath !== routes.ACCOUNT) {
            console.log('Verification: Redirecting to continueUrl');
            goto(gotoPath);
          }
        } else {
          notify.success(`${$_('auth.verification.success')} ${$_('auth.verification.sign-in')}`);
          goto(routes.SIGN_IN);
        }
      } catch (ex) {
        if (get(user) && (await isEmailVerifiedAndTokenSynced())) {
          notify.success($_('auth.verification.refresh'), 12000);
          return goto(routes.ACCOUNT);
        } else {
          console.error('Error during email action/auth email verification ', ex);
          notify.danger($_('auth.verification.expired'), 15000);
          return goto(routes.ACCOUNT);
        }
      }
    }
  };

  // TODO: the async actions here are not awaited.
  // it would probably be safer to do so in an an onMount
  // to be sure that initialization is completed before component
  // internals are modified
  // https://github.com/sveltejs/svelte/issues/5501
  handleAction();
</script>

<PaddedSection>
  <p>{loadingState}</p>
</PaddedSection>
