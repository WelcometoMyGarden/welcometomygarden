<script lang="ts">
  import '$lib/styles/reset.css';
  import '$lib/styles/global.css';
  import * as Sentry from '@sentry/sveltekit';

  import { onMount } from 'svelte';
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
  import { activeUnlocalizedPath, activeRootPath } from '$lib/routes';
  import { PUBLIC_WTMG_HOST } from '$env/static/public';
  import { initializeUser } from '$lib/stores/user';
  import { staticAppHasLoaded, appHasLoaded, coercedLocale, rootModal } from '$lib/stores/app';
  import { keyboardEvent } from '$lib/stores/keyboardEvent';
  import { isFullscreen } from '$lib/stores/fullscreen';
  import { Capacitor } from '@capacitor/core';
  import { SplashScreen } from '@capacitor/splash-screen';
  import { initializeNativePush } from '$lib/api/push-registrations/native.js';
  import logger from '$lib/util/logger.js';
  import { CapacitorSwipeBackPlugin } from '@notnotsamuel/capacitor-swipe-back';
  import { App as CapacitorApp, type URLOpenListenerEvent } from '@capacitor/app';
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
      CapacitorSwipeBackPlugin.enable().then(() => logger.debug('Swipe Back plugin enabled'));
    }
  }

  let { children }: Props = $props();

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
   * It does rely on calc() and viewport units (vh) etc (Chrome 26+, Safari 6+)
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

  onMount(() => {
    return Sentry.startSpan({ name: 'Root Layout Load', op: 'app.load' }, async () => {
      logger.log('Mounting root layout');
      if (Capacitor.isNativePlatform()) {
        await SplashScreen.hide();
        // for (let i = 0; i < 6; i++) {
        // await StatusBar.setOverlaysWebView({ overlay: true })
        // await SafeArea.enable({
        //   config: {
        //     // TODO: not working for now
        //     // https://github.com/capacitor-community/safe-area/issues/55
        //     customColorsForSystemBars: true,
        //     // statusBarColor: '#00000000', // transparent
        //     statusBarContent: 'dark',
        //     // navigationBarColor: '#00000000', // transparent
        //     navigationBarContent: 'dark'
        //   }
        // }).then(() => console.debug('Capacitor: safe area values set'));
        // await (new Promise(resolve => setTimeout(resolve, 50)));
        // }
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
      localEnvString = !page.url.hostname.endsWith('welcometomygarden.org')
        ? `local project: ${import.meta.env.VITE_FIREBASE_PROJECT_ID}`
        : null;

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
<!-- This specific error banner may be useful for another case, or if we restore some
      kind of app check -->
<!-- {#if typeof $locale == 'string'}
  <div class="permanent-error">
    <div>
      {@html $_('generics.error.app-check.message', {
        values: {
          linkText: anchorText({
            href: `${$_('generics.helpcenter-url')}master/${{ en: '2.-to-use-wtmg-on-firefox', nl: '2.-wtmg-gebruiken-in-firefox', fr: '2.-pour-utiliser-wtmg-sur-firefox' }[coerceToMainLanguage($locale)]}`,
            class: 'error-link',
            linkText: $_('generics.error.app-check.link-text')
          })
        }
      })}
    </div>
  </div>
{/if} -->
<div
  id="wtmg-app"
  class="app active-{$activeRootPath} active-route-{page?.route?.id} locale-{$coercedLocale}"
  class:fullscreen={$isFullscreen}
  class:error-banner={false}
  class:native={Capacitor.isNativePlatform()}
  class:ios={Capacitor.getPlatform() === 'ios'}
  class:android={Capacitor.getPlatform() === 'android'}
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

  .app.active-routeplanner {
    padding-top: 0;
  }

  .app.active-explore {
    /* Avoid scrollbars */
    overflow-y: auto;
  }
  .app.active-explore > :global(main) {
    /* Make sure the map fills the entire space */
    height: 100%;
    /* No max-width on the explore page */
    max-width: unset;
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
    /* A variable, so it can be reused when the nav bar has to dodge this */
    --height-error-banner: 4rem;
  }

  .permanent-error {
    height: var(--height-error-banner);
    background-color: #fbf2f5;
    color: #931c1a;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 600;
    width: 100%;
  }
  .permanent-error > div {
    padding: 1.4rem;
    line-height: 1.3;
  }
  .permanent-error :global(.error-link) {
    text-decoration: underline;
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

    /* Add a general safe inset padding on native, except on the map */
    .app.native.ios:not(.active-explore) {
      padding-top: env(safe-area-inset-top);
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

    /* On mobile there is no top nav to take into account */
    .permanent-error {
      height: auto;
    }

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
    :global(.app.active-route-\/\[\[lang\]\]\/\(stateful\)\/chat\/\[name\]\/\[chatId\]) {
      overflow: hidden;
    }

    .app > :global(main) {
      height: 100%;
    }
  }
</style>
