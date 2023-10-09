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
  import { user } from '$lib/stores/auth';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import registerLocales from '$locales/register';
  import { onDestroy, onMount } from 'svelte';
  import { init, isLoading, locale } from 'svelte-i18n';
  import { updateCommunicationLanguage } from '$lib/api/user';
  import MinimalFooter from '$lib/components/MinimalFooter.svelte';
  import { isActiveContains } from '$lib/util/isActive';
  import routes from '$lib/routes';
  import { page } from '$app/stores';
  import { resetChatStores } from '$lib/stores/chat';
  import coercedBrowserLang, { coerceToSupportedLanguage } from '$lib/util/get-browser-lang';
  import type { SupportedLanguage } from '$lib/types/general';
  import { isFullscreen } from '$lib/stores/fullscreen';
  import { appHasLoaded, rootModal } from '$lib/stores/app';
  import Modal from 'svelte-simple-modal';
  import IosNotificationPrompt from '../lib/components/Notifications/IOSPWANotificationModal.svelte';
  import {
    createPushRegistrationObserver,
    getCurrentNativeSubscription,
    isOnIDevicePWA
  } from '$lib/api/push-registrations';
  import { NOTIFICATION_PROMPT_DISMISSED_COOKIE } from '$lib/constants';
  import { resetPushRegistrationStores } from '$lib/stores/pushRegistrations';
  import { get } from 'svelte/store';

  type MaybeUnsubscriberFunc = (() => void) | undefined;

  // React to locale initialization or changes
  const unsubscribeFromLocale = locale.subscribe((value) => {
    if (value == null) return;
    if (typeof window !== 'undefined') {
      // Set a locale cookie if the browser/cookie locale is different from the requested locale,
      // so the setting will be remembered.
      const localeCookie = getCookie('locale');
      if (value && (coercedBrowserLang() !== value || (localeCookie && localeCookie !== value))) {
        setCookie('locale', value, { path: '/' });
      }
      // Update the locale in Firebase, if we're logged in, and if it changed
      if (value && $user && $user.communicationLanguage !== value) {
        updateCommunicationLanguage(value);
      }
    }
  });

  let firebaseObserverUnsubscribers: MaybeUnsubscriberFunc[] = [undefined, undefined, undefined];

  // FYI: assigning to destructured values also triggers Svelte reactivity
  // https://svelte.dev/repl/e45c5d54a69d422f83de79f03d2d8a48
  $: [
    unsubscribeFromAuthObserver,
    unsubscribeFromChatObserver,
    unsubscribeFromPushRegistrationObserver
  ] = firebaseObserverUnsubscribers;

  let vh = `0px`;

  let hasShownIOSNotificationsModal = false;

  // React to user changes
  let unsubscribeFromUser: (() => void) | null = null;

  const initializeUser = () =>
    (unsubscribeFromUser = user.subscribe(async (latestUser) => {
      // If the user logged in and has a verified email
      if (!!latestUser && latestUser.emailVerified) {
        // without verified email: no messages, no garden, no chats
        firebaseObserverUnsubscribers = [
          // Leave the auth observer as-is (the value that last reacted)
          unsubscribeFromAuthObserver,
          // Subscribe to the chat observer
          createChatObserver(),
          // Subscribe to the push registration observer
          createPushRegistrationObserver()
        ];
      }

      // If the user logged out (or was never logged in)
      if (!latestUser) {
        // Unsubscribe from the chat & push registration observers if the user logged out
        if (unsubscribeFromChatObserver) {
          console.log(`Unsubscribing from chat observer & resetting stores`);
          unsubscribeFromChatObserver();
          unsubscribeFromChatObserver = undefined;
          resetChatStores();
        }

        if (unsubscribeFromPushRegistrationObserver) {
          console.log(`Unsubscribing from push registrations & resetting stores`);
          unsubscribeFromPushRegistrationObserver();
          unsubscribeFromPushRegistrationObserver = undefined;
          resetPushRegistrationStores();
        }
      }

      // For a logged in user generally
      if (latestUser) {
        // Set a communication language to the current locale, when there is none yet
        if (!latestUser.communicationLanguage && $locale) {
          updateCommunicationLanguage($locale);
        }
        // Use the user-configured account communication language locally, if present
        if (latestUser.communicationLanguage) {
          locale.set(latestUser.communicationLanguage);
        }
      }

      // After user login, detect startup on PWA iOS which doesn't have pre-existing push
      // registrations
      // TODO: check if this loads after loading pre-existing push registrations?
      // TODO: make this influence dismissal somehow?
      const notificationsDismissed = getCookie(NOTIFICATION_PROMPT_DISMISSED_COOKIE);
      if (
        // Prevent the modal from being shown twice in the same boot session (we might get multiple user updates)
        !hasShownIOSNotificationsModal &&
        // We're logged in...
        latestUser !== null &&
        // ... the browser has no native sub registered (but support exists)
        (await getCurrentNativeSubscription()) === null &&
        // ... the user hasn't dismissed notifications
        notificationsDismissed !== 'true' &&
        // ... we're on the PWA of a supporting iOS version (preventing this from appearing on Android/... browsers)
        isOnIDevicePWA()
      ) {
        rootModal.set(IosNotificationPrompt);
        hasShownIOSNotificationsModal = true;
      }
    }));

  const initializeSvelteI18n = async () => {
    registerLocales();

    let lang: SupportedLanguage;
    const localeCookie = getCookie('locale');
    if (localeCookie) {
      // Start from a cookie, if present.
      lang = coerceToSupportedLanguage(localeCookie);
    } else {
      lang = coercedBrowserLang();
    }

    // Initialize svelte-i18n
    await init({ fallbackLocale: 'en', initialLocale: lang });

    // It's possible that a user account has a different language setting,
    // this will then be updated in user.subscribe above. We're not waiting
    // for the user load to initialize svelte-i18n.
  };

  onMount(async () => {
    vh = `${window.innerHeight * 0.01}px`;

    await initializeSvelteI18n();
    // Initialize Firebase
    await initialize();
    if (!unsubscribeFromAuthObserver) {
      unsubscribeFromAuthObserver = createAuthObserver();
    }
    // Initialize the user data (dependent on Firebase auth)
    initializeUser();
  });

  onDestroy(() => {
    // In what case do we destroy the root layout though? 🤔
    for (let observerUnsubscriber of firebaseObserverUnsubscribers) {
      if (observerUnsubscriber) {
        observerUnsubscriber();
      }
    }
    firebaseObserverUnsubscribers = [undefined, undefined, undefined];

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

<Modal show={$rootModal} unstyled={true} closeButton={false}>
  <div
    class="app active-{$page?.route?.id?.substring(1).split('/')[0]} locale-{$locale}"
    class:fullscreen={$isFullscreen}
    style="--vh:{vh}"
  >
    {#if browser}
      <Progress active={!$appHasLoaded} />
      <Notifications />
    {/if}
    {#if $appHasLoaded}
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
</Modal>

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
