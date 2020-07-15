<script>
  import { onDestroy } from 'svelte';
  import { isLoading as isLocaleLoading } from 'svelte-i18n';
  import { params } from '@sveltech/routify';
  import { createAuthObserver } from '@/api/auth';
  import { setAllUserInfo } from '@/api/user';
  import { createChatObserver } from '@/api/chat';
  import { user, isInitializing } from '@/stores/auth';
  import { Progress, Notifications } from '@/components/UI';
  import Nav from '../components/Nav/Navigation.svelte';
  import Footer from '@/components/Footer.svelte';

  let unsubscribeFromAuthObserver = createAuthObserver();
  let unsubscribeFromChatObserver;

  let infoIsReady = false;

  const addUserInformation = async () => {
    try {
      await setAllUserInfo();
    } catch (ex) {
      console.log(ex);
    }
    if ($user.emailVerified) unsubscribeFromChatObserver = await createChatObserver();
  };

  $: if ($params.confirmed) infoIsReady = false;
  $: if ($user) {
    addUserInformation().then(() => (infoIsReady = true));
  } else if (!$isInitializing) infoIsReady = true;

  onDestroy(() => {
    if (unsubscribeFromChatObserver) unsubscribeFromChatObserver();
    if (unsubscribeFromAuthObserver) unsubscribeFromAuthObserver();
  });

  let vh = `${window.innerHeight * 0.01}px`;
  const updateViewportHeight = () => {
    vh = `${window.innerHeight * 0.01}px`;
  };
</script>

<svelte:window on:resize={updateViewportHeight} />

<div class="app" style="--vh:{vh}">
  <Progress active={$isInitializing || $isLocaleLoading || !infoIsReady} />
  <Notifications />

  {#if !$isInitializing && !$isLocaleLoading && infoIsReady}
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  {/if}
</div>

<style>
  .app {
    --height-nav: 7rem;
    --height-footer: 18rem;
    width: 100%;
    height: 100%;
    position: relative;
    padding-top: var(--height-nav);
  }

  main {
    min-height: calc(100% - var(--height-footer));
    width: 100%;
    overflow: hidden;
    max-width: 155rem;
    margin: 0 auto;
  }

  @media screen and (max-width: 700px) {
    .app {
      padding-top: 0;
    }

    main {
      min-height: calc(100% - var(--height-nav));
      padding-bottom: calc(var(--height-nav));
    }
  }
</style>
