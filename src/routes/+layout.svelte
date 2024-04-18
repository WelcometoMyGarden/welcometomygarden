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
  import { init, locale } from 'svelte-i18n';
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
  import { afterNavigate, beforeNavigate, onNavigate } from '$app/navigation';

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

  /**
   * This is a JS-based reimplementation of dvh
   * https://developer.mozilla.org/en-US/docs/Web/CSS/length#dynamic
   *
   * It's main purspose today is compatibility, because dvh is badly supported on 1y+ old browsers.
   * https://caniuse.com/viewport-unit-variants
   *
   * See also: https://codepen.io/th0rgall/pen/gOqrMdj
   */
  let vh = `0px`;

  let hasShownIOSNotificationsModal = false;

  // React to user changes
  let unsubscribeFromUser: (() => void) | null = null;

  const initializeUser = () =>
    (unsubscribeFromUser = user.subscribe(async (latestUser) => {
      // If the user logged in and has a verified email, or if it has changed
      if (!!latestUser && latestUser.emailVerified) {
        // without verified email: no messages, no garden, no chats
        firebaseObserverUnsubscribers = [
          // Leave the auth observer as-is, it should be initialized already
          unsubscribeFromAuthObserver,
          // Subscribe to the chat observer, if not initialized yet
          unsubscribeFromChatObserver == null ? createChatObserver() : unsubscribeFromChatObserver,
          // Subscribe to the push registration observer, if not initialized yet
          unsubscribeFromPushRegistrationObserver == null
            ? createPushRegistrationObserver()
            : unsubscribeFromPushRegistrationObserver
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
    console.log('Mounting root layout');
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

  let appContainer: HTMLDivElement;

  // Scroll to 0,0 on every navigation
  onNavigate(() => {
    // Workaround for the issue that the scroll position is not resetting to 0,0 on <a> or goto() navigations.
    // due to us scrolling on the inner app container, and not on the root <html>
    // See this: https://github.com/sveltejs/kit/issues/2733#issuecomment-1543863772
    // NOTE: this will probably kill the `noScroll` feature that goto() has, but we haven't used this anyway.
    //
    // We use onNavigate() instead of afterNavigate() to work around this problem that makes Kit alway scroll to 0,0 anyway
    // https://github.com/sveltejs/kit/issues/10823
    appContainer?.scrollTo(0, 0);
  });

  // Capture & restore on back-forward navigation
  export const snapshot = {
    capture: () => appContainer?.scrollTop,
    restore: (y) => {
      appContainer?.scrollTo(0, y);
    }
  };
</script>

<svelte:window on:resize={updateViewportHeight} on:keyup={onCustomPress} />

<div
  class="app active-{$page?.url?.pathname?.substring(1).split('/')[0]} active-route-{$page?.route
    ?.id} locale-{$locale}"
  class:fullscreen={$isFullscreen}
  style="--vh:{vh}"
  bind:this={appContainer}
>
  <!-- Make the modal a child of .app, so that it inherits its CSS -->
  <Modal show={$rootModal} unstyled={true} closeButton={false}>
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
  </Modal>
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
    position: relative;
    /* Compensate for the desktop nav bar */
    padding-top: var(--height-nav);

    /* The <footer> is not part of <main>,
      so we don't want main to be scrollable
      rather: the root above it should be scrollable
       */
    height: calc(var(--vh, 1vh) * 100);
    height: 100dvh;
    /* The home page for example overflows */
    overflow-y: scroll;

    /* Allows the <footer> to expand to the bottom when the screen is taller than the <main> content */
    /* Note:
          flex changes the behavior of `height` on its children: it isn't interpreted strictly
          if their descendants are is smaller, and thus the child is shrinkable. Flexbox tries to
          avoid overflow where it can.
          `min-height` must be used to impose stricter limitations on the child's height  */
    display: flex;
    flex-direction: column;
  }

  main {
    width: 100%;
    /* Anchor overflow:hidden on descendants
    (there was a problem with .welcome-map in LandingSection with this before) */
    position: relative;
    max-width: 155rem;
    margin: 0 auto;

    /* (min-)heights for <main> are configured per page below */
    /* - They can not be configured here, since a (min-)height content that might overflow the viewport
         like / or /info/rules needs to have unconstrained height.
       - If it is constrained, then the parent flexbox will cause strange overlaps on low viewport heights.
         In that case, it's better to contrain <main>'s descendants in terms of (d)vh to ensure the whole remains scrollable
     */
  }

  .app.active-explore {
    /* Avoid scrollbars */
    overflow-y: auto;
  }
  .app.active-explore > main {
    /* Make sure the map fills the entire space */
    height: 100%;
    /* No max-width on the explore page */
    max-width: unset;
  }
  /*
    If the chat page is active, make sure it expands to the full available height.
    It is designed to not overflow it. */
  .app.active-chat > main {
    /* 1060px: on very tall screens, don't fill the entire height with the chat  */
    min-height: min(100%, 1060px);
  }

  .app.active-error > main {
    /* Since <main> is a flex child, 100% helps it compete for space with the footer.
    It won't actually reach 100%  */
    height: min(100%, 800px);
  }

  .app.active-error > :global(footer) {
    margin-top: 0;
  }

  @media screen and (max-width: 700px) {
    .app {
      padding-top: 0;
      /* dvh is needed here to (dynamically) escape dynamic browser chrome UI */
      /* The safe area inset is useful, among others, on
       - iOS PWA: avoid overlapping with the bottom drawer
       */
      height: calc(var(--vh, 1vh) * 100 - var(--height-mobile-nav));
      overflow-x: hidden;
    }

    /* On the iOS PWA, we bump the height of the nav (and entire app) with
       the safe area inset. However, scrollable content is still visible in that inset, which looks weird.
       This hides the content below the menu.*/
    /* .app::after {
      content: '';
      display: block;
      position: fixed;
      width: 100%;
      height: env(safe-area-inset-bottom, 0);
      bottom: 0;
      left: 0;
      right: 0; */
    /* opaque white */
    /* background: #fff;
    } */

    @supports (height: 100dvh) {
      .app {
        height: calc(100dvh - var(--height-mobile-nav));
      }
    }

    /*
     Specific chat pages have scrollable message lists. On iOS, any scrollable ancestors
     may take over from the message list, leading to weird scroll behavior.
     Note: makes the footer invisible! But there is no footer on mobile.
     TODO: might not fix it entirely yet... sometimes you need to pause after a nav to be able to scroll the main container.
   */
    .app.active-route-\/chat\/\[name\]\/\[chatId\] {
      overflow: hidden;
    }

    main {
      height: 100%;
    }
  }
</style>
