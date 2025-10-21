<script lang="ts">
  import { getAllListedGardens } from '$lib/api/garden';
  import MembershipModal from '$lib/components/Membership/MembershipModal.svelte';
  import { appHasLoaded } from '$lib/stores/app';
  import { resolveOnUserLoaded, user } from '$lib/stores/auth';
  import { allListedGardens } from '$lib/stores/garden';
  import { onDestroy, onMount } from 'svelte';
  import { derived, type Readable } from 'svelte/store';
  import LoginModal from './LoginModal.svelte';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { t, locale } from 'svelte-i18n';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import { browser } from '$app/environment';
  import { coerceToMainLanguage } from '$lib/util/get-browser-lang';
  import { lr } from '$lib/util/translation-helpers';
  import routes, { getBaseRouteIn } from '$lib/routes';

  let gardenUnsubscriber: () => void;

  let continueUrl = '/routeplanner';
  let showMembershipModal = false;
  let showLoginModal = false;

  const combinedStore = derived([allListedGardens, user], ([_gardens, _user]) => ({
    gardens: _gardens,
    savedGardens: _user?.savedGardens ?? [],
    member: !!_user?.superfan,
    userId: _user?.id ?? null
  }));

  let iframe: HTMLIFrameElement;

  const sendDataUpdate = (
    data: typeof combinedStore extends Readable<infer D> ? D : never,
    attempts = 0
  ) => {
    console.log('new data update');
    if (attempts > 2) {
      console.log('too many attempts to send to a non-existent iframe');
      return;
    }
    if (!iframe) {
      // infinite recursion danger
      console.log('postponing data send');
      setTimeout(() => sendDataUpdate(data, attempts + 1), 200);
      return;
    }
    iframe.contentWindow?.postMessage(data, import.meta.env.VITE_ROUTEPLANNER_HOST);
  };

  function onload() {
    gardenUnsubscriber = combinedStore.subscribe(sendDataUpdate);
  }

  onMount(async () => {
    console.log('Mounting');
    // Load gardens in the background
    getAllListedGardens();

    await resolveOnUserLoaded();

    // Start sending messages when the scripts have loaded
    if (!iframe?.contentWindow) {
      console.error('iframe not loaded yet in onmount');
    } else {
      iframe.contentWindow?.status;
      iframe.contentWindow?.addEventListener('load', () => {
        console.log('iframe domcontentloaded');
      });
    }

    window.addEventListener(
      'message',
      async (event) => {
        console.log('wtmg: new event!', event);
        if (event.origin !== import.meta.env.VITE_ROUTEPLANNER_HOST) return;
        if (event.data === 'ready') {
        } else if (event.data === 'login-member') {
          await resolveOnUserLoaded();
          if ($user && !$user.superfan) {
            const { hash, search } = $page.url;
            continueUrl = `/routeplanner${search}${hash}`;
          }
          showLoginModal = true;
        } else if (typeof event.data !== 'string' && event.data != null) {
          if (event.data.type === 'hash-update' && event.data.hash !== '') {
            // Using goto and not replaceState, because https://github.com/sveltejs/kit/issues/10661
            goto($lr(`/routeplanner${event.data.hash}`), { keepFocus: true, replaceState: true });
          }
        }
      },
      false
    );
  });

  afterNavigate(async (navigation) => {
    // It is possible that we return here after coming from /login
    // onMount is not called
    if (
      !navigation.to?.route?.id ||
      getBaseRouteIn(navigation.to?.route?.id) !== routes.ROUTE_PLANNER
    ) {
      return;
    }
    // This URL parameter tells that we should show the membership modal if needed
    if ($page.url.searchParams.get('m') === '1') {
      // Make sure the user is loaded first
      await resolveOnUserLoaded();
      if ($user?.superfan) {
        return;
      }
      showMembershipModal = true;
      trackEvent(PlausibleEvent.OPEN_MEMBERSHIP_MODAL, {
        source: 'routeplanner'
      });
      // Remove the URL param
      const { searchParams, hash } = $page.url;
      searchParams.delete('m');
      // Using goto and not replaceState, because https://github.com/sveltejs/kit/issues/10661
      goto(`/routeplanner?${searchParams.toString()}${hash}`, {
        keepFocus: true,
        replaceState: true
      });
    }
  });

  onDestroy(() => {
    if (gardenUnsubscriber) {
      gardenUnsubscriber();
    }
  });

  function injectParams(params: URLSearchParams) {
    const cloned = new URLSearchParams(params);

    // Insert a main language lng parameter, but only if one was not explicitly provided.
    // This is to avoid issues with a half-translated brouter-web, since our modifications
    // are at the moment only made in en/fr/nl.
    if (!cloned.has('lng')) {
      cloned.set('lng', coerceToMainLanguage($locale));
    }
    return cloned;
  }
</script>

<svelte:head>
  <title>{$t('footer.links.route-planner.title')} | {$t('generics.wtmg.explicit')}</title>
</svelte:head>

{#if browser}
  <!-- Guard access to $page.url based on browser env -->
  <iframe
    bind:this={iframe}
    title="WTMG Route Planner"
    src={`${import.meta.env.VITE_ROUTEPLANNER_HOST}?${injectParams($page.url.searchParams).toString()}${$page.url.hash}`}
    frameborder="0"
    on:load={onload}
  ></iframe>
{/if}

{#if $appHasLoaded}
  <MembershipModal bind:show={showMembershipModal} {continueUrl} />
  <LoginModal bind:show={showLoginModal} bind:showMembershipModal />
{/if}

<style>
  iframe {
    width: 100%;
    height: 100%;
  }

  :global(body div.app.active-routeplanner) {
    --height-mobile-nav: 0rem !important;
  }
</style>
