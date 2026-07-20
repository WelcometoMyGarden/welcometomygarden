<script lang="ts">
  import '$lib/styles/reset.css';
  import '$lib/styles/global.css';
  import * as Sentry from '@sentry/sveltekit';

  import { onMount, tick } from 'svelte';
  import { page } from '$app/state';
  import Modal from 'svelte-simple-modal';
  import { onNavigate } from '$app/navigation';
  import trackEvent, { registerCustomPropertyTracker } from '$lib/util/track-plausible';
  import { Notifications, Progress } from '$lib/components/UI';
  import { browser } from '$app/environment';
  import { _, locale } from 'svelte-i18n';
  import { initialize as initializeFirebase } from '$lib/api/firebase';
  import { PlausibleEvent } from '$lib/types/Plausible.js';
  import Meta from '$lib/components/SEO/Meta.svelte';
  import { SUPPORTED_LANGUAGES } from '$lib/types/general.js';
  import { urlPathPrefix } from '$lib/util/translation-helpers';
  import routes, { activeUnlocalizedPath, activeRootPath, getBaseRouteIn } from '$lib/routes';
  import { PUBLIC_WTMG_HOST } from '$env/static/public';
  import { initializeUser } from '$lib/stores/user';
  import {
    staticAppHasLoaded,
    appHasLoaded,
    coercedLocale,
    rootModal,
    resolveOnStaticAppHasLoaded
  } from '$lib/stores/app';
  import notify from '$lib/stores/notification';
  import { formatNumericDate } from '$lib/util/format-date';
  import { replaceState } from '$app/navigation';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import { isFullscreen } from '$lib/stores/fullscreen';
  import { Capacitor } from '@capacitor/core';
  import { SplashScreen } from '@capacitor/splash-screen';
  import { initializeNativePush } from '$lib/api/push-registrations/native.js';
  import logger from '$lib/util/logger.js';
  import { CapacitorSwipeBackPlugin } from '@notnotsamuel/capacitor-swipe-back';
  import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
  import { Network } from '@capacitor/network';
  import { goto } from '$lib/util/navigate.js';
  import { isMobile } from '$lib/stores/ui.svelte.js';
  import { isNative } from '$lib/util/uaInfo.js';
  import { getLocalEnvString } from '$lib/util/environment';
  import { setShouldPanToGardenLocation } from './[[lang]]/(stateful)/explore/shared.svelte';
  interface Props {
    children?: import('svelte').Snippet;
  }

  if (Capacitor.isNativePlatform()) {
    initializeNativePush();
    if (Capacitor.getPlatform() === 'android') {
      // TODO: remove listener on cleanup? CapacitorApp.removeAllListeners("backButton")
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          CapacitorApp.exitApp();
        } else {
          window.history.back();
        }
      });
    } else {
      CapacitorSwipeBackPlugin.enable().then(() => {
        DEV: logger.debug('Swipe Back plugin enabled');
      });
    }

    CapacitorApp.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
      try {
        let { pathname, search, hash } = new URL(event.url);
        let pathPart = `${pathname}${search}${hash}`;
        if (pathPart) {
          let baseRoute = getBaseRouteIn(pathname);
          if (baseRoute === routes.APP_PAYMENT) {
            logger.warn('TODO Unhandled');
            return;
          }
          goto(pathPart).then(() => {
            if (baseRoute === routes.MAP && /\/explore\/garden\/\w+/.test(pathPart)) {
              // If we are currently already on the map, and the opened link has a garden in the URL,
              // then ensure the map pans to the target garden location, despite the fact
              // that the map layout's onMount will not fire after a goto() to the same layout.
              // This state is reactively listened to by an $effect in the explore layout.
              setShouldPanToGardenLocation(true);
            }
          });
        }
      } catch (e) {
        logger.error(`Error parsing appUrl open ${event.url}`);
      }
    });
  } else {
    DEV: logger.debug('Not a native platform, skipping native push');
  }

  let { children }: Props = $props();

  // Toast-via-query-param handling, for authenticated actions that redirect into
  // the app (e.g. managing a membership from an email link).
  // We tried doing this in the two layout.ts files, but that did not work for a reason
  // that took too long to find.
  // This approach could support more toast types later.
  const TOAST_PARAMS = ['toast', 'when'];

  /** Triggers a toast based on the current `toast` query param, if present. */
  const triggerToastFromUrl = (url: URL) => {
    const toast = url.searchParams.get('toast');
    if (toast === 'membership-expired') {
      const whenParam = url.searchParams.get('when');
      const when = whenParam ? new Date(whenParam) : null;
      const date =
        when && !Number.isNaN(when.getTime()) ? formatNumericDate(when, $locale ?? 'en') : '';
      notify.info($_('generics.toast.membership-expired', { values: { date } }));
    }
  };

  /** Removes the toast-related query params from the URL, without a reload. */
  const stripToastParams = (url: URL) => {
    const newUrl = new URL(url);
    TOAST_PARAMS.forEach((param) => newUrl.searchParams.delete(param));
    replaceState(`${newUrl.pathname}${newUrl.search}${newUrl.hash}`, page.state);
  };

  if (browser) {
    initializeFirebase()
      .then(initializeUser)
      .catch((e) => logger.error('Error during init', e));
  }

  /**
   * This is a JS-based reimplementation of dvh
   * https://developer.mozilla.org/en-US/docs/Web/CSS/length#dynamic
   *
   * It's main purspose today is compatibility, because dvh is badly supported on 1y+ old browsers.
   * https://caniuse.com/viewport-unit-variants
   *
   * It does resetShouldMoveToGardenLocationrt units (vh) etc (Chrome 26+, Safari 6+)
   *
   * Note: if the JS here fails in unsupported browsers (e.g. Chrome <84),
   * this will make the page look weirdly narrow in height, because of the
   * default 0px value of vh below. src/browser-support.js implements
   * a workaround for this.
   *
   * See also: https://codepen.io/th0rgall/pen/gOqrMdj
   */
  let vh = $state(`0px`);

  /**
   * Helps us know which Firebase environment we're targetting
   */
  let localEnvString: string | null = $state(null);

  /**
   * Whether the device currently has no internet connection, detected via @capacitor/network
   * (uses the native connectivity APIs on iOS/Android, and `navigator.onLine` + online/offline
   * events on the web). Drives the permanent offline warning banner.
   */
  let isOffline = $state(false);

  /**
   * Route IDs of data-entry pages where reloading on connectivity restore could discard
   * in-progress user input. We skip the reload on these.
   */
  const RELOAD_EXEMPT_ROUTE_IDS = new Set([
    '/[[lang]]/(stateful)/chat/[name]/[chatId]',
    '/[[lang]]/(stateful)/garden/edit',
    '/[[lang]]/(stateful)/garden/add'
  ]);

  /**
   * Reloads the current page.
   *
   * On iOS (WKWebView) a plain `window.location.reload()` does NOT re-fetch resour ces that
   * previously failed to load while offline (e.g. dynamically imported JS chunks / CSS): the
   * webview serves the failed/empty responses from its session cache, so the page flashes and
   * then crashes on the same missing module. To work around this, we ask the native layer to do
   * an end-to-end, cache-ignoring reload via `WKWebView.reloadFromOrigin()` (registered as the
   * `wtmgHardReload` script message handler in `OfflineGateViewController.swift`).
   *
   * Android WebView and the regular web don't have this problem, so they use the normal reload.
   */
  const hardReload = () => {
    const wtmgHardReload = (
      window as unknown as {
        webkit?: { messageHandlers?: { wtmgHardReload?: { postMessage: (msg: unknown) => void } } };
      }
    ).webkit?.messageHandlers?.wtmgHardReload;
    if (Capacitor.getPlatform() === 'ios' && wtmgHardReload) {
      wtmgHardReload.postMessage(null);
    } else {
      window.location.reload();
    }
  };

  onMount(() => {
    return Sentry.startSpan({ name: 'Root Layout Load', op: 'app.load' }, async () => {
      // Note: we don't unregister from this handler, since the root layout should be called only once.
      // Also only wire up connectivity detection when the plugin is actually available (true on the web and on native shells that
      // include it); otherwise skip it entirely so we don't trigger "not implemented" errors.
      if (Capacitor.isPluginAvailable('Network')) {
        Network.getStatus()
          .then((status) => {
            isOffline = !status.connected;
          })
          .catch(() => {});
        Network.addListener('networkStatusChange', (status) => {
          const wasOffline = isOffline;
          isOffline = !status.connected;
          // When connectivity is restored after having been lost, do a hard reload of the current
          // page so it reflects the latest state — unless we're on a data-entry route where a
          // reload could discard in-progress input.
          // This helps when you are e.g. on the home page and
          // 1) lose connection, 2) go to /explore (shows an error), 3) regain connection
          // -> the /explore page does not rerun onMount or reload -> you're stuck
          // Note: I tried to use SvelteKit's `invalidateAll` here, that did not work.
          if (
            wasOffline &&
            status.connected &&
            !RELOAD_EXEMPT_ROUTE_IDS.has(page.route?.id ?? '')
          ) {
            hardReload();
          }
        }).catch(() => {});
      }
      logger.log('Mounting root layout');
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
      }

      vh = `${window.innerHeight * 0.01}px`;

      // Initialize page view property tracking via the Plausible script element/
      // as soon as Svelte has mounted the root layout (including the script)
      const plausibleScriptElement = document.querySelector('script#plausible');
      if (plausibleScriptElement) {
        registerCustomPropertyTracker(plausibleScriptElement);
      }

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // https://www.ctrl.blog/entry/detect-machine-translated-webpages.html
          // I can't observe x-bergamot-translated anymore though
          let translationSignalsPresent = !!document.querySelector(
            'html.translated-ltr, html.translated-rtl, ya-tr-span, *[_msttexthash], *[x-bergamot-translated]'
          );
          // Firefox Bergamot switches this to the target language
          let htmlLangChanged = document.documentElement.getAttribute('lang') !== $locale;
          if (translationSignalsPresent || htmlLangChanged) {
            trackEvent(PlausibleEvent.USED_BROWSER_TRANSLATION);
          }
        }
      });

      // Display an indicator on test hosts to see which project is active
      // for example on localhost, a local network IP, bs-local.com (Browserstack), ...
      localEnvString = getLocalEnvString(page.url.hostname);

      const url = page.url;
      if (!url.searchParams.has('toast')) {
        return;
      } else {
        // Handle toasts:
        // - wait for the locale to load
        // - wait for a tick after mount, otherwise SvelteKit complains about using replaceState
        //   while the router is not yet initialized
        Promise.all([tick(), resolveOnStaticAppHasLoaded()]).then(() => {
          triggerToastFromUrl(url);
          // Strip the params so a refresh/back-navigation doesn't re-trigger the toast.
          stripToastParams(url);
        });
      }

      // No unsubscribers are used due to this being an async initializer
    });
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

  let appContainer: HTMLDivElement = $state();

  // Prevent zooming on mobile/touch platforms
  $effect(() => {
    const mobileExtraViewportRules = ',minimum-scale=1.0,maximum-scale=1.0,user-scalable=no';
    const viewport = document.head.querySelector('[name="viewport"]');
    const viewportContent = viewport?.getAttribute('content');
    if (!viewport || !viewportContent) {
      return;
    }
    if (isMobile() || isNative) {
      // When switching to a mobile viewport, add the statements
      if (!viewportContent.includes(mobileExtraViewportRules))
        viewport.setAttribute('content', viewportContent + mobileExtraViewportRules);
    } else {
      // When switching to a desktop viewport, remove the statements
      if (viewportContent.includes(mobileExtraViewportRules)) {
        viewport.setAttribute('content', viewportContent.replace(mobileExtraViewportRules, ''));
      }
    }
  });

  // Scroll to 0,0 on every navigation
  onNavigate(() => {
    // Workaround for the issue that the scroll position is not resetting to 0,0 on <a> or goto() navigations.
    // due to us scrolling on the inner app container, and not on the root <html>
    // See this: https://github.com/sveltejs/kit/issues/2733#issuecomment-1543863772
    // NOTE: this will probably kill the `noScroll` feature that goto() has, but we haven't used this anyway.
    //
    // We use onNavigate() instead of afterNavigate() to work around this problem that makes Kit always scroll to 0,0 anyway
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

<svelte:window onresize={updateViewportHeight} onkeyup={onCustomPress} />

<svelte:head>
  {#if $staticAppHasLoaded}
    <!-- Static tags -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Welcome To My Garden" />
    <meta name="twitter:card" content="summary_large_image" />
    <!-- URL tags -->
    <meta property="og:url" content={PUBLIC_WTMG_HOST} />
    <meta name="twitter:url" content={PUBLIC_WTMG_HOST} />
    <!-- Title tag -->
    <Meta property="og:title" itemKey="title" fallbackContent="Welcome To My Garden" />
    <Meta name="twitter:title" itemKey="title" fallbackContent="Welcome To My Garden" />
    <!-- Description tags -->
    <Meta name="description" pageKey="general" />
    <Meta property="og:description" itemKey="description" pageKey="general" />
    <Meta name="twitter:description" itemKey="description" pageKey="general" />
    <!-- Image tags -->
    <Meta
      property="og:image"
      itemKey="image-url"
      fallbackContent="{PUBLIC_WTMG_HOST}/images/card-social.jpg"
    />
    <Meta
      property="og:image:secure_url"
      itemKey="image-url"
      fallbackContent="{PUBLIC_WTMG_HOST}/images/card-social.jpg"
    />
    <Meta
      property="twitter:image"
      itemKey="image-url"
      fallbackContent="{PUBLIC_WTMG_HOST}/images/card-social.jpg"
    />
    <Meta
      property="og:image:alt"
      itemKey="image-alt"
      fallbackContent="Welcome To My Garden tent and map"
    />
    <meta property="og:image:type" content="image/jpeg" />
    <!-- <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" /> -->
    <!-- Keywords tags -->
    <Meta property="og:keywords" pageKey="general" itemKey="keywords" />
  {/if}
  <!-- Alternate languages
      https://developers.google.com/search/docs/specialty/international/localized-versions
    -->
  {#each SUPPORTED_LANGUAGES as lang}
    <link
      rel="alternate"
      hreflang={lang}
      href="{PUBLIC_WTMG_HOST}{urlPathPrefix(lang)}{$activeUnlocalizedPath}"
    />
  {/each}
  <link rel="alternate" hreflang="x-default" href="{PUBLIC_WTMG_HOST}{$activeUnlocalizedPath}" />
</svelte:head>

{#if browser}
  <Progress active={!$appHasLoaded} />
{/if}
{#if browser && isOffline && $staticAppHasLoaded}
  <div class="permanent-error" role="alert" aria-live="assertive">
    <div>
      {$_(
        page.route?.id === '/[[lang]]/(stateful)/chat/[name]/[chatId]'
          ? 'generics.error.offline-chat'
          : 'generics.error.offline'
      )}
    </div>
  </div>
{/if}
<div
  id="wtmg-app"
  class="app active-{$activeRootPath} active-route-{page?.route?.id} locale-{$coercedLocale}"
  class:fullscreen={$isFullscreen}
  class:error-banner={browser && isOffline}
  class:native={Capacitor.isNativePlatform()}
  class:ios={Capacitor.getPlatform() === 'ios'}
  class:android={Capacitor.getPlatform() === 'android'}
  class:supports-safe-area={Capacitor.getPlatform() === 'ios' ||
    Capacitor.isPluginAvailable('SafeArea')}
  style="--vh:{vh}"
  bind:this={appContainer}
>
  <!-- Make the modal a child of .app, so that it inherits its CSS -->
  <Modal show={$rootModal} unstyled={true} closeButton={false}>
    {#if browser}
      <Notifications />
    {/if}
    {@render children?.()}
  </Modal>
  {#if localEnvString}
    <div class="local-env-string">{localEnvString}</div>
  {/if}
</div>

<style>
  .app {
    width: 100%;
    height: 100%;
    position: relative;
    padding-top: var(--height-nav);
    /* Compensate for the desktop nav bar */
    /* TODO: this hides the scrollbar ov overflow-y: scroll below
       under the navbar.
       possible solution
       - margin-top instead here AND - var(--height-nav)) in the height calc below AND overflow: hidden on the div that is a child of <body>
       - remove overflow-y: scroll below
       But I'm not sure what the repercussions of that are elsewhere */

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

  /* When the offline banner is shown, shrink the app by the banner height so the banner
     (which sits above the app in normal flow) doesn't push content past the viewport. */
  .app.error-banner {
    height: calc(var(--vh, 1vh) * 100 - var(--height-error-banner));
    height: calc(100dvh - var(--height-error-banner));
  }

  .app > :global(main) {
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

  .app.active-routeplanner,
  .app.active-app-payment {
    padding-top: 0;
  }

  .app.active-explore,
  .app.active-every15km {
    /* Avoid scrollbars */
    overflow-y: auto;
  }
  .app.active-explore > :global(main),
  .app.active-every15km > :global(main) {
    /* Make sure the map fills the entire space */
    height: 100%;
    /* No max-width on the map pages */
    max-width: unset;
  }
  .app.active-every15km > :global(main) {
    /* <main> is the containing block of the /every15km info box. Clip it so the
       box's slide-in/out transform can't extend the scrollable .app and flash a
       (content-shifting) scrollbar during the animation. */
    overflow: hidden;
  }
  /*
    If the chat page is active, make sure it expands to the full available height.
    It is designed to not overflow it. */
  .app.active-chat > :global(main) {
    /* 1060px: on very tall screens, don't fill the entire height with the chat  */
    min-height: min(100%, 1060px);
  }

  .app.active-error > :global(main) {
    /* Since <main> is a flex child, 100% helps it compete for space with the footer.
    It won't actually reach 100%  */
    height: min(100%, 800px);
  }

  .app.active-error > :global(footer) {
    margin-top: 0;
  }

  :global(body) {
    /*
      A variable, so it can be reused when the nav bar has to dodge this.
      Since it is always on top, safe area is always included.
    */
    --height-error-banner: calc(4rem + env(safe-area-inset-top, 0px));
  }

  .permanent-error {
    /* Includes top safe area */
    height: var(--height-error-banner);
    /* Yellow warning band, matching the native offline gate. */
    background-color: var(--color-warning);
    color: var(--color-green);
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 600;
    width: 100%;
    /* Clear the status bar / notch on native. */
    padding-top: env(safe-area-inset-top, 0px);
  }
  .permanent-error > div {
    padding: 0.8rem 1.4rem;
    line-height: 1.3;
    text-align: center;
  }

  .local-env-string {
    z-index: 9999;
    display: block;
    position: fixed;
    bottom: 3px;
    right: 3px;
    background-color: yellow;
    color: black;
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

    .app.error-banner {
      height: calc(var(--vh, 1vh) * 100 - var(--height-mobile-nav) - var(--height-error-banner));
    }

    /* Add a general safe inset padding on native, except on the map & chat
      (they don't need it, or have their own safe area handling)
       Also remove the inset on .error-banner, which has its own inset.
      */
    .app.native.supports-safe-area:not(.error-banner):not(.active-explore):not(
        .active-every15km
      ):not(.active-chat) {
      padding-top: env(safe-area-inset-top, 0px);
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

    .permanent-error {
      /*
      On mobile there is no top nav to take into account.
      - on /explore, there is no fixed element on top -> the map cleanly moves below the error
      - on specific chat pages, there is a fixed top element/header, things are messier there
       */
      height: auto;
      /* The following two help to overlay the specific chat header  */
      position: relative;
      z-index: 11;
    }

    @supports (height: 100dvh) {
      .app {
        height: calc(100dvh - var(--height-mobile-nav));
      }
      .app.error-banner {
        height: calc(100dvh - var(--height-mobile-nav) - var(--height-error-banner));
      }
    }

    /*
     Specific chat pages have scrollable message lists. On iOS, any scrollable ancestors
     may take over from the message list, leading to weird scroll behavior.
     Note: makes the footer invisible! But there is no footer on mobile.
     TODO: might not fix it entirely yet... sometimes you need to pause after a nav to be able to scroll the main container.
   */
    :global(.app.active-route-\/\[\[lang\]\]\/\(stateful\)\/chat\/\[name\]\/\[chatId\]) {
      overflow: hidden;
    }

    .app > :global(main) {
      height: 100%;
    }
  }
</style>
