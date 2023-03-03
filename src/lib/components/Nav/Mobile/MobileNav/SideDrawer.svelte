<script lang="ts">
  import { _ } from 'svelte-i18n';
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
  import { DONATION_URL } from '$lib/constants';

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

  const donationUrlParams = new URLSearchParams({
    ...($user
      ? {
          prefilled_email: $user.email,
          client_reference_id: $user.id
        }
      : {}),
    utm_source: 'welcometomygarden.org',
    utm_medium: 'web',
    utm_campaign: 'donation_payment',
    utm_content: 'side_navbar'
  });

  let sideLinks: { route: string; name: string }[];
  $: sideLinks = [
    { route: routes.FAQ, name: $_('generics.faq.acronym') },
    { route: `${DONATION_URL}?${donationUrlParams.toString()}`, name: $_('footer.links.donate') },
    { route: routes.COOKIE_POLICY, name: $_('generics.cookie-policy') },
    { route: routes.PRIVACY_POLICY, name: $_('generics.privacy-policy') },
    { route: routes.TERMS_OF_USE, name: $_('generics.terms-of-use') }
  ];
</script>

<div class:shown={isOpen} class="overlay" />
<ul class="drawer" class:open={isOpen} use:clickOutside on:click-outside={handleClickOutsideDrawer}>
  <li class="socials">
    <Socials small />
  </li>
  <li class="slowby-bar">
    <span class="title">{$_('navigation.slowby-notice.prompt')}</span>
    <span
      >{@html $_('navigation.slowby-notice.answer', {
        values: {
          slowbyLink: `<a
        class="link"
        style="color:inherit"
        href="${$_(
          'generics.slowby-url'
        )}?utm_source=welcometomygarden.org&utm_medium=web&utm_content=side_navbar"
        target="_blank"
        rel="noopener">${$_('navigation.slowby-notice.slowby-link-text')}
        </a>`
        }
      })}</span
    >
  </li>
  <li class="main-links-container">
    <ul class="main-links">
      <li>
        <a class="highlighted" href={routes.ABOUT_SUPERFAN} on:click={toggleDrawer}>
          {$_('generics.become-superfan')}
        </a>
      </li>
      <li>
        <a href={routes.ABOUT_US} on:click={toggleDrawer}>{$_('generics.about-us')}</a>
      </li>
      <li>
        <a href={routes.RULES} on:click={toggleDrawer}>{$_('generics.rules')}</a>
      </li>
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
      {#each sideLinks as { route, name } (route)}
        <li>
          <a href={route} on:click={toggleDrawer} class:active={isActive($page, route)}>{name}</a>
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
    transition: top 0.3s, right 0.3s, bottom 0.3s, left 0.3s;
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

  ul > li.slowby-bar {
    width: 100%;
    background-color: var(--color-beige-light);
    padding: 1.5rem;
  }

  .slowby-bar .title {
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
    transition: width 0.3s ease 0s, left 0.3s ease 0s;
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
