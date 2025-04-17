<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { page } from '$app/stores';
  import { logout } from '$lib/api/auth';
  import { clickOutside } from '$lib/directives';
  import Socials from '$lib/components/Socials.svelte';
  import LanguageSelector from '$lib/components/LanguageSelector.svelte';
  import routes from '$lib/routes';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { isActive } from '$lib/util/isActive';
  import { createEventDispatcher } from 'svelte';
  import { COMMUNITY_FORUM_URL, SHOP_URL } from '$lib/constants';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import trackEvent from '$lib/util/track-plausible';
  import { renewalNoticeContent, subscriptionJustEnded } from '$lib/stores/subscription';
  import { coerceToMainLanguageENBlank } from '$lib/util/get-browser-lang';
  import { bannerLink, shouldShowBanner } from '$lib/stores/app';
  import { transKeyExists } from '$lib/util';
  import { anchorText } from '$lib/util/translation-helpers';

  const dispatch = createEventDispatcher();
  export let isOpen = false;
  const toggleDrawer = () => {
    dispatch('toggle');
  };

  export let hamburger: HTMLButtonElement | null;

  const handleClickOutsideDrawer = (event) => {
    const { clickEvent } = event.detail;
    // The main menu is liften on top of (= outside of) this drawer.
    // A tap on the main menu close button is hence considered as an "outside click"
    // Toggling it here would lead to a double-toggle (actual click handler + this one): no result.

    // It also seems that :
    // 1. this toggleDrawer results in a state change in the parent custom event listener first
    // 2. the actual onclick event on the close button somehow receives old isDrawerOpen state
    // This makes the following detection the only way to deal with this situation.
    if (isOpen && !hamburger?.contains(clickEvent.target)) toggleDrawer();
  };

  const wtmgSignURLParams = new URLSearchParams({
    ...($user
      ? {
          // More fields could be prefilled too https://tally.so/help/pre-populate-form-fields#d145bec3bde2446b8ae17a4357494950
          wtmg: $user.id
        }
      : {}),
    ref: 'wtmg_sidebar'
  });

  let sideLinks: {
    route: string;
    name: string;
    track?: Parameters<typeof trackEvent>;
    target?: string;
  }[];
  $: sideLinks = [
    { route: routes.FAQ, name: $_('generics.faq.acronym') },
    {
      route: `${SHOP_URL}${coerceToMainLanguageENBlank(
        $locale ?? undefined
      )}?${wtmgSignURLParams.toString()}`,
      name: $_('footer.links.wtmg-sign.title'),
      target: '_blank'
    },
    { route: routes.COOKIE_POLICY, name: $_('generics.cookie-policy') },
    { route: routes.PRIVACY_POLICY, name: $_('generics.privacy-policy') },
    { route: routes.TERMS_OF_USE, name: $_('generics.terms-of-use') }
  ];

  $: shouldShowRenewalNotice = $user && $user.stripeSubscription && $subscriptionJustEnded;
</script>

<div class:shown={isOpen} class="overlay" />
<ul class="drawer" class:open={isOpen} use:clickOutside on:click-outside={handleClickOutsideDrawer}>
  <li class="socials">
    <Socials small />
  </li>
  <li class="superfan-bar" class:show={$shouldShowBanner}>
    {#if shouldShowRenewalNotice}
      <span class="title">{$renewalNoticeContent?.prompt}</span>
      <span>{@html $renewalNoticeContent?.answerHtml}</span>
    {:else if $shouldShowBanner}
      {#if transKeyExists('navigation.banner.prompt')}
        <span class="title">{$_('navigation.banner.prompt')}</span>
      {/if}
      <span
        >{@html $_('navigation.banner.answer', {
          values: {
            link: anchorText({
              href: $bannerLink,
              linkText: $_('navigation.banner.link-text'),
              style: 'text-decoration: underline; cursor: pointer;',
              newtab: true
            })
          }
        })}
      </span>
    {/if}
  </li>
  <li class="main-links-container">
    <ul class="main-links">
      {#if !$user?.superfan}
        <li>
          <a
            class="highlighted"
            href={routes.ABOUT_MEMBERSHIP}
            on:click={() => {
              trackEvent(PlausibleEvent.VISIT_ABOUT_MEMBERSHIP, { source: 'side_navbar' });
              toggleDrawer();
            }}
          >
            {$_('generics.become-member')}
          </a>
        </li>
      {/if}
      <li>
        <a href={routes.ABOUT_US} on:click={toggleDrawer}>{$_('generics.about-us')}</a>
      </li>
      <li>
        <a
          href={routes.RULES}
          on:click={() => {
            trackEvent(PlausibleEvent.VISIT_RULES, { source: 'side_navbar' });
            toggleDrawer();
          }}>{$_('generics.rules')}</a
        >
      </li>
      {#if $user?.superfan}
        <li>
          <a href={COMMUNITY_FORUM_URL} style="margin-right: 0.6rem;">{$_('generics.community')}</a>
        </li>
      {/if}
      <li>
        <LanguageSelector />
      </li>
      <li>
        {#if $user}
          <li class="separated sign-out">
            <a
              href="/"
              on:click|preventDefault={async () => {
                toggleDrawer();
                await logout();
                goto(routes.HOME);
              }}
            >
              Sign out
            </a>
          </li>
        {/if}
      </li>
    </ul>
  </li>

  <li>
    <ul class="side-links">
      {#each sideLinks as { route, name, track: trackParams, target } (route)}
        <li>
          <a
            href={route}
            on:click={() => {
              if (trackParams) trackEvent(...trackParams);
              toggleDrawer();
            }}
            {target}
            class:active={isActive($page, route)}
            >{name}
          </a>
        </li>
      {/each}
    </ul>
  </li>
</ul>

<style>
  .overlay {
    width: 100%;
    height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    position: fixed;
    top: 0;
    bottom: 0;
    right: 200%;
    left: -100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 100;
    overflow: hidden;
    text-align: center;
    transition:
      top 0.3s,
      right 0.3s,
      bottom 0.3s,
      left 0.3s;
  }

  .overlay.shown {
    right: 0;
    left: 0;
  }

  .drawer {
    background-color: var(--color-white);
    height: calc(calc(var(--vh, 1vh) * 100) - var(--height-nav));
    width: 25rem;
    position: fixed;
    top: 0;
    right: 0;
    z-index: 100;
    display: grid;
    grid-template-rows: 4rem min-content auto min-content;
    -webkit-font-smoothing: antialiased;
    transition: transform 0.3s cubic-bezier(0.77, 0.2, 0.05, 1);
    transform-origin: 0% 0%;
    transform: translate(100%, 0);

    padding: 0 0 var(--height-mobile-nav) 0;
  }

  .socials {
    width: 100%;
    justify-self: center;
    align-self: center;
  }

  ul.drawer > li.main-links-container {
    justify-self: start;
    align-self: center;
    padding-left: 3.5rem;
  }

  .side-links {
    font-size: 1.1rem;
    text-transform: uppercase;
    margin: 1rem 0;
    letter-spacing: 0.1em;
    padding-left: 3.5em;
  }

  ul > li.superfan-bar.show {
    width: 100%;
    background-color: var(--color-beige-light);
    padding: 1.5rem;
    line-height: 1.4;
    /* TODO: this one should be temporary, it is needed for the longer blog notice */
    margin-bottom: 1rem;
  }

  ul > li.superfan-bar:not(.show) {
    height: 1rem;
  }
  .superfan-bar .title {
    font-weight: 600;
    font-size: 1.1rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  li a.highlighted {
    display: inline-block;
    border-bottom: 2px solid var(--color-orange-light);
  }

  .drawer.open {
    transform: scale(1, 1);
    opacity: 1;
  }

  .drawer ul.main-links li:not(:first-child) {
    margin-top: 2rem;
  }

  .drawer ul.side-links li {
    margin-top: 0.5rem;
    line-height: 2;
  }

  .drawer li.separated {
    margin-top: 3.5rem;
  }

  .drawer a {
    font-weight: 600;
    position: relative;
  }

  .drawer a:after {
    background: none repeat scroll 0 0 transparent;
    bottom: -0.2rem;
    content: '';
    display: block;
    height: 2px;
    left: 50%;
    position: absolute;
    background: var(--color-green);
    transition:
      width 0.3s ease 0s,
      left 0.3s ease 0s;
    width: 0;
  }

  .drawer a.active:after,
  .drawer a:focus:after,
  .drawer a:hover:after {
    width: 100%;
    left: 0;
  }

  .sign-out {
    color: var(--color-orange);
  }
</style>
