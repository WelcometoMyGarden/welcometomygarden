<script lang="ts">
  import '$lib/styles/reset.css';
  import '$lib/styles/global.css';

  import { browser } from '$app/environment';
  import { createChatObserver } from '$lib/api/chat';
  import Footer from '$lib/components/Footer.svelte';
  import Nav from '$lib/components/Nav/Navigation.svelte';
  import { Notifications, Progress } from '$lib/components/UI';
  import { getCookie, setCookie } from '$lib/util';
  import { createAuthObserver } from '$lib/api/auth';
  import { initialize } from '$lib/api/firebase';
  import { isInitializing, user, isUserLoading } from '$lib/stores/auth';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import registerLocales from '$locales/register';
  import { onDestroy, onMount } from 'svelte';
  import { init, isLoading as isLocaleLoading, locale } from 'svelte-i18n';
  import { updateCommunicationLanguage } from '$lib/api/user';
  import MinimalFooter from '$lib/components/MinimalFooter.svelte';
  import { isActiveContains } from '$lib/util/isActive';
  import routes from '$lib/routes';
  import { page } from '$app/stores';
  import { resetChatStores } from '$lib/stores/chat';
  import getBrowserLang, { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';
  import type { SupportedLanguage } from '$lib/types/general';

  // React to locale initialization or changes
  const unsubscribeFromLocale = locale.subscribe((value) => {
    if (value == null) return;
    if (typeof window !== 'undefined') {
      // Set a locale cookie if the browser/cookie locale is different from the requested locale,
      // so the setting will be remembered.
      const localeCookie = getCookie('locale');
      if (value && (getBrowserLang() !== value || (localeCookie && localeCookie !== value))) {
        setCookie('locale', value, { path: '/' });
      }
      // Update the locale in Firebase if we're logged in
      if (value && $user && $user.communicationLanguage !== value) {
        updateCommunicationLanguage(value);
      }
    }
  });

  let unsubscribeFromAuthObserver: (() => void) | undefined;
  let unsubscribeFromChatObserver: (() => void) | undefined;

  let vh = `0px`;

  // React to user changes
  const unsubscribeFromUser = user.subscribe(async (latestUser) => {
    // Subscribe to the chat observer if the user logged in, and has a verified email
    if (!unsubscribeFromChatObserver && latestUser && latestUser.emailVerified)
      unsubscribeFromChatObserver = await createChatObserver(latestUser.uid);

    // Unsubscribe if the user logged out
    if (unsubscribeFromChatObserver && !latestUser) {
      console.log(`Unsubscribing from chat observer & resetting stores`);
      unsubscribeFromChatObserver();
      unsubscribeFromChatObserver = undefined;
      resetChatStores();
    }

    // Set a communication language when there is none yet
    if (latestUser && !latestUser.communicationLanguage && $locale)
      updateCommunicationLanguage($locale);
  });

  const initializeSvelteI18n = () => {
    registerLocales();

    let lang: SupportedLanguage;
    const localeCookie = getCookie('locale');
    if (localeCookie) {
      // Start from a cookie, if present.
      lang = coerceToSupportedLanguage(localeCookie);
    } else {
      lang = getBrowserLang();
    }

    // Initialize svelte-i18n
    init({ fallbackLocale: 'en', initialLocale: lang });
  };

  onMount(async () => {
    initializeSvelteI18n();
    // Initialize Firebase
    await initialize();
    if (!unsubscribeFromAuthObserver) {
      unsubscribeFromAuthObserver = createAuthObserver();
    }

    vh = `${window.innerHeight * 0.01}px`;
  });

  onDestroy(() => {
    if (unsubscribeFromChatObserver) {
      unsubscribeFromChatObserver();
      unsubscribeFromChatObserver = undefined;
    }
    if (unsubscribeFromAuthObserver) {
      unsubscribeFromAuthObserver();
      unsubscribeFromAuthObserver = undefined;
    }
    if (unsubscribeFromUser) {
      unsubscribeFromUser();
    }
    if (unsubscribeFromLocale) {
      unsubscribeFromLocale();
    }
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

<div
  class="app active-{$page?.route?.id?.substring(1).split('/')[0]} locale-{$locale}"
  style="--vh:{vh}"
>
  {#if browser}
    <Progress active={$isInitializing || $isLocaleLoading || $isUserLoading} />
    <Notifications />
  {/if}

  {#if !$isInitializing && !$isLocaleLoading && !$isUserLoading}
    <Nav />
    <main>
      <slot />
    </main>
    {#if isActiveContains($page, routes.MAP)}
      <MinimalFooter />
    {:else}
      <Footer />
    {/if}
  {/if}
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
    position: relative;
    padding-top: var(--height-nav);
  }

  main {
    min-height: calc(100vh - var(--height-nav) - var(--height-footer));
    width: 100%;
    overflow: hidden;
    /* Anchor overflow:hidden on descendants
    (there was a problem with .welcome-map in LandingSection with this before) */
    position: relative;
    max-width: 155rem;
    margin: 0 auto;
  }

  @media screen and (max-width: 700px) {
    .app {
      padding-top: 0;
    }

    main {
      min-height: calc(100vh - var(--height-mobile-nav) - env(safe-area-inset-bottom));
      padding-bottom: calc(var(--height-mobile-nav) + env(safe-area-inset-bottom));
    }
  }
</style>
