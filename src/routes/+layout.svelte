<script lang="ts">
  export let data;

  import '$lib/styles/reset.css';
  import '$lib/styles/global.css';

  import { browser } from '$app/environment';
  import { onDestroy, onMount } from 'svelte';
  import { isLoading as isLocaleLoading } from 'svelte-i18n';
  import { createAuthObserver } from '@/lib/api/auth';
  import { doesPublicUserExist } from '@/lib/api/user';
  import { createChatObserver } from '$lib/api/chat';
  import { user, isInitializing, getUser } from '@/lib/stores/auth';
  import { keyboardEvent } from '@/lib/stores/keyboardEvent';
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

  let lang;

  let vh = `0px`;

  user.subscribe(async (tempUser) => {
    console.log('User changed to', tempUser);
    if (!unsubscribeFromChatObserver && tempUser && tempUser.emailVerified)
      unsubscribeFromChatObserver = await createChatObserver(tempUser.uid);

    if (unsubscribeFromChatObserver && !tempUser) unsubscribeFromChatObserver();
  });

  onMount(async () => {
    lang = getCookie('locale'); //en or nl or ...
    if (!lang && window.navigator.language)
      // TODO: check if the language is supported
      lang = window.navigator.language.split('-')[0].toLowerCase();
    if (!lang) lang = 'en';

    init({ fallbackLocale: 'en', initialLocale: lang });

    // Initialize Firebase
    await initialize();
    if (!unsubscribeFromAuthObserver) unsubscribeFromAuthObserver = createAuthObserver();

    vh = `${window.innerHeight * 0.01}px`;
  });

  onDestroy(() => {
    if (unsubscribeFromChatObserver) unsubscribeFromChatObserver();
    if (unsubscribeFromAuthObserver) unsubscribeFromAuthObserver();
  });

  const updateViewportHeight = () => {
    vh = `${window.innerHeight * 0.01}px`;
  };

  const onCustomPress = (e: KeyboardEvent) => {
    if (e?.altKey) {
      e.preventDefault();
      e.stopPropagation();
      keyboardEvent.set(e);
    }
  };
</script>

<svelte:window on:resize={updateViewportHeight} on:keyup={onCustomPress} />

<div class="app" style="--vh:{vh}">
  {#if browser}
    <Progress active={$isInitializing || $isLocaleLoading} />
    <Notifications />
  {/if}

  {#if !$isInitializing && !$isLocaleLoading}
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
