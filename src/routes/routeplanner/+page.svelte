<script lang="ts">
  import { getAllListedGardens } from '$lib/api/garden';
  import MembershipModal from '$lib/components/Membership/MembershipModal.svelte';
  import { appHasLoaded } from '$lib/stores/app';
  import { resolveOnUserLoaded, user } from '$lib/stores/auth';
  import { allListedGardens } from '$lib/stores/garden';
  import { onDestroy, onMount } from 'svelte';
  import { derived } from 'svelte/store';
  import LoginModal from './LoginModal.svelte';

  let gardenUnsubscriber: () => void;

  let showMembershipModal = false;
  let showLoginModal = false;

  const combinedStore = derived([allListedGardens, user], ([_gardens, _user]) => ({
    gardens: _gardens,
    savedGardens: _user?.savedGardens ?? [],
    member: !!_user?.superfan
  }));

  let iframe: HTMLIFrameElement;

  function onload() {
    gardenUnsubscriber = combinedStore.subscribe((data) => {
      console.log('new data update');
      iframe.contentWindow?.postMessage(data, import.meta.env.VITE_ROUTEPLANNER_HOST);
    });
  }

  onMount(async () => {
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
            showMembershipModal = true;
          } else if (!$user) {
            // goto(`${routes.SIGN_IN}?continueUrl=/routeplanner`);
            showLoginModal = true;
          }
        }
      },
      false
    );
  });

  onDestroy(() => {
    if (gardenUnsubscriber) {
      gardenUnsubscriber();
    }
  });
</script>

<iframe
  bind:this={iframe}
  title="WTMG Route Planner"
  src={import.meta.env.VITE_ROUTEPLANNER_HOST}
  frameborder="0"
  on:load={onload}
></iframe>

{#if $appHasLoaded}
  <MembershipModal bind:show={showMembershipModal} continueUrl="/routeplanner" />
  <LoginModal bind:show={showLoginModal} />
{/if}

<style>
  iframe {
    width: 100%;
    height: 100%;
  }
</style>
