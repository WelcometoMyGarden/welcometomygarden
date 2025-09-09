<script lang="ts">
  import { getAllListedGardens } from '$lib/api/garden';
  import MembershipModal from '$lib/components/Membership/MembershipModal.svelte';
  import { appHasLoaded } from '$lib/stores/app';
  import { resolveOnUserLoaded, user } from '$lib/stores/auth';
  import { allListedGardens } from '$lib/stores/garden';
  import { onDestroy, onMount } from 'svelte';
  import { derived, type Readable } from 'svelte/store';
  import LoginModal from './LoginModal.svelte';
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { t } from 'svelte-i18n';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';

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
    if (!iframe.contentWindow) {
      console.error('IFRAME NOT LOADED YET');
    }
    iframe.contentWindow?.status;
    iframe.contentWindow?.addEventListener('load', () => {
      console.log('iframe domcontentloaded');
    });

    window.addEventListener(
      'message',
      async (event) => {
        console.log('wtmg: new event!', event);
        if (event.origin !== import.meta.env.VITE_ROUTEPLANNER_HOST) return;
        if (event.data === 'ready') {
        } else if (event.data === 'login-member') {
          await resolveOnUserLoaded();
          if ($user && !$user.superfan) {
            const { hash, search } = window.location;
            continueUrl = `/routeplanner${search}${hash}`;
          }
          showLoginModal = true;
        } else if (typeof event.data !== 'string' && event.data != null) {
          if (event.data.type === 'hash-update' && event.data.hash !== '') {
            // replaceState matches mostly the behavior of location.replace() used by the hash router
            window.history.replaceState({}, '', `/routeplanner${event.data.hash}`);
          }
        }
      },
      false
    );
  });

  afterNavigate(async (navigation) => {
    // It is possible that we return here after coming from /login
    // onMount is not called
    if (navigation.to?.route?.id !== '/routeplanner') {
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
      window.history.replaceState({}, '', `/routeplanner?${searchParams.toString()}${hash}`);
    }
  });

  onDestroy(() => {
    if (gardenUnsubscriber) {
      gardenUnsubscriber();
    }
  });
</script>

<svelte:head>
  {#if $appHasLoaded}
    <title>Routeplanner | {$t('generics.wtmg.explicit')}</title>
  {/if}
</svelte:head>
<iframe
  bind:this={iframe}
  title="WTMG Route Planner"
  src={`${import.meta.env.VITE_ROUTEPLANNER_HOST}${window.location.hash}`}
  frameborder="0"
  on:load={onload}
></iframe>

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
