<script lang="ts">
  export let data;
  console.log('+layout.svelte' + data);
  import { onDestroy, onMount, tick } from 'svelte';
  import { isLoading as isLocaleLoading } from 'svelte-i18n';
  import { createAuthObserver } from '@/lib/api/auth';
  import { setAllUserInfo } from '@/lib/api/user';
  import { createChatObserver } from '$lib/api/chat';
  import { user, isInitializing } from '@/lib/stores/auth';
  import { Progress, Notifications } from '$lib/components/UI';
  import Nav from '$lib/components/Nav/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let unsubscribeFromAuthObserver: () => void;
  let unsubscribeFromChatObserver: () => void;

  let infoIsReady = false;

  const addUserInformation = async () => {
    try {
      await setAllUserInfo();
    } catch (ex) {
      console.log(ex);
    }
    if ($user?.emailVerified) unsubscribeFromChatObserver = await createChatObserver();
  };

  // TODO: Fix this after builing the project works
  // $: if ($params.confirmed) infoIsReady = false;

  $: if ($user) {
    addUserInformation().then(() => (infoIsReady = true));
  } else if (!$isInitializing) infoIsReady = true;

  let vh = `14px`;

  onMount(async () => {
    console.log('onMount +layout.svelte');
    if (!unsubscribeFromAuthObserver) unsubscribeFromAuthObserver = createAuthObserver();

    vh = `${window.innerHeight * 0.01}px`;
    tick().then(() => {
      updateViewportHeight();
    });
  });

  onDestroy(() => {
    if (unsubscribeFromChatObserver) unsubscribeFromChatObserver();
    if (unsubscribeFromAuthObserver) unsubscribeFromAuthObserver();
  });

  const updateViewportHeight = () => {
    vh = `${window.innerHeight * 0.01}px`;
  };
</script>

<svelte:window on:resize={updateViewportHeight} />

<div class="app" style="--vh:{vh}">
  <!-- <Progress active={$isInitializing || $isLocaleLoading || !infoIsReady} /> -->
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
