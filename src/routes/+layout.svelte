<script lang="ts">
  export let data;

  import '$lib/styles/reset.css';
  import '$lib/styles/global.css';

  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import { isLoading as isLocaleLoading } from 'svelte-i18n';
  import { createAuthObserver } from '@/lib/api/auth';
  import { doesPublicUserExist, setAllUserInfo } from '@/lib/api/user';
  import { createChatObserver } from '$lib/api/chat';
  import { user, isInitializing } from '@/lib/stores/auth';
  import { Progress, Notifications } from '$lib/components/UI';
  import Nav from '$lib/components/Nav/Navigation.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { initialize } from '@/lib/api/firebase';
  import { locale, init } from 'svelte-i18n';
  import { setCookie, getCookie } from '$lib/util';
  import registerLocales from '@/locales/register';

  registerLocales();

  locale.subscribe((value) => {
    if (value == null) return;
    // if running in the client, save the language preference in a cookie
    if (typeof window !== 'undefined') setCookie('locale', value, { path: '/' });
  });

  let unsubscribeFromAuthObserver: () => void;
  let unsubscribeFromChatObserver: () => void;

  let infoIsReady = false;

  let lang;

  let vh = `0px`;

  onMount(async () => {
    lang = getCookie('locale'); //en or nl or ...
    if (!lang && window.navigator.language)
      lang = window.navigator.language.split('-')[0].toLowerCase();
    if (!lang) lang = 'en';

    init({ fallbackLocale: 'en', initialLocale: lang });

    await initialize();
    if (!unsubscribeFromAuthObserver) unsubscribeFromAuthObserver = createAuthObserver();

    vh = `${window.innerHeight * 0.01}px`;
  });

  $: if ($user) {
    addUserInformation().finally(() => (infoIsReady = true));
  } else if (!$isInitializing) infoIsReady = true;

  const addUserInformation = async () => {
    // If the user is registered with email and pwd AND it has a public doc THEN set all the user information
    if (!($user && $user.id && (await doesPublicUserExist($user.id)))) return;
    try {
      await setAllUserInfo();
    } catch (ex) {
      console.log(ex);
    }
    if ($user?.emailVerified) unsubscribeFromChatObserver = await createChatObserver();
  };

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
  {#if browser}
    <Progress active={$isInitializing || $isLocaleLoading || !infoIsReady} />
    <Notifications />
  {/if}

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
    /* min-height: calc(100% - var(--height-footer)); */
    min-height: calc(100vh - var(--height-nav) - var(--height-footer));
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
