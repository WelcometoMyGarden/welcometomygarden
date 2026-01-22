<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { _ } from 'svelte-i18n';
  import notify from '$lib/stores/notification';
  import { checkAndHandleUnverified } from '$lib/api/auth';
  import { discourseConnectLogin } from '$lib/api/functions';
  import routes from '$lib/routes';
  import { user } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import MarketingStyleWrapper from '$lib/components/Marketing/MarketingStyleWrapper.svelte';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import * as Sentry from '@sentry/sveltekit';
  import { lr } from '$lib/util/translation-helpers';
  import logger from '$lib/util/logger';

  // Note: searchParams values will already be URL-decoded
  const sso = $derived(page.url.searchParams.get('sso'));
  const sig = $derived(page.url.searchParams.get('sig'));

  let displayMessage = $state('');

  onMount(async () => {
    if (typeof sso === 'string' && typeof sig === 'string' && !!$user) {
      if (!$user.superfan) {
        displayMessage = $_('auth.discourse.superfan');
        return;
      }

      if (!$user.emailVerified) {
        return checkAndHandleUnverified();
      }
      logger.log('Attempting Discourse login');
      displayMessage = $_('auth.discourse.logging-in');
      // attempt login
      try {
        let {
          data: { sso: responseSsoPayload, sig: responseSig, return_sso_url }
        } = await discourseConnectLogin({
          sso,
          sig
        });

        // Add compatibility for local testing on different systems
        // Even though the Discourse Docker dev env might be running on
        // a remote local host e.g. http://192.168.2.119:4200, the backend
        // is running on port 3000 in the Docker container. Discourse wrongly
        // attempts to redirect requests there.
        if (return_sso_url.startsWith('http://localhost:3000')) {
          return_sso_url = return_sso_url.replace(
            'http://localhost:3000',
            import.meta.env.VITE_DISCOURSE_HOST
          );
        }

        // Note: URLSearchParam URL-encodes values
        const returnUrlParams = new URLSearchParams({ sso: responseSsoPayload, sig: responseSig });
        const redirectUrl = `${return_sso_url}?${returnUrlParams.toString()}`;

        window.location.href = redirectUrl;
      } catch (e) {
        logger.error(e);
        notify.danger($_('auth.discourse.failed'));
        Sentry.captureException(e);
        goto($lr(routes.HOME));
        return;
      }
    } else if (!$user) {
      // not logged in: redirect to sign in with continueUrl
      const continueUrl = `${routes.AUTH_DISCOURSE}?${page.url.searchParams.toString()}`;
      goto($lr(`${routes.SIGN_IN}?continueUrl=${encodeURIComponent(continueUrl)}`));
    } else {
      logger.log(
        'Entered the discourse-connect page without valid parameters, redirecting to home.'
      );
      goto($lr(routes.HOME));
    }
  });
</script>

<svelte:head>
  <title>{$_('generics.wtmg.explicit')}</title>
</svelte:head>

<MarketingStyleWrapper><PaddedSection>{displayMessage}</PaddedSection></MarketingStyleWrapper>
