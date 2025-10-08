<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import { user } from '$lib/stores/auth';
  import { tentIcon, mapIcon, chatIcon, signInIcon, userIcon } from '$lib/images/icons';
  import Hamburger from './Hamburger.svelte';
  import { Icon } from '$lib/components/UI';
  import { isActive, isActiveContains } from '$lib/util/isActive';
  import { page } from '$app/stores';
  import SideDrawer from './MobileNav/SideDrawer.svelte';
  import { chatsCountWithUnseenMessages } from '$lib/stores/chat';
  import Badge from '../Badge.svelte';
  import { signInLinkWithGarden } from '$lib/components/Map/Map.svelte';

  let hamburger: HTMLButtonElement | null = null;
  let drawerIsShown = false;
  const toggleDrawer = () => (drawerIsShown = !drawerIsShown);
</script>

<nav id="navigation">
  <ul class="main">
    <!-- TODO: render this from data with a component rather than repeating code -->
    <li>
      <a href={routes.HOME} class:active={isActive($page, '/')}>
        <Icon icon={tentIcon} />
        <span>{$_('generics.home')}</span>
      </a>
    </li>
    <li>
      <a href={routes.MAP} class:active={isActiveContains($page, routes.MAP)}>
        <Icon icon={mapIcon} />
        {$_('generics.map')}
      </a>
    </li>
    {#if $user}
      <li>
        <a href={routes.CHAT} class:active={isActiveContains($page, routes.CHAT)}>
          <Icon icon={chatIcon} />
          {$_('generics.chat')}
          <Badge count={$chatsCountWithUnseenMessages} />
        </a>
      </li>
      <li>
        <a href={routes.ACCOUNT} class:active={isActive($page, routes.ACCOUNT)}>
          <Icon icon={userIcon} />
          {$_('generics.account')}
        </a>
      </li>
    {:else}
      <li>
        <a href={$signInLinkWithGarden} class:active={isActive($page, routes.SIGN_IN)}>
          <Icon icon={signInIcon} />
          {$_('generics.sign-in')}
        </a>
      </li>
    {/if}
    <li class="hamburger">
      <Hamburger bind:hamburger on:click={toggleDrawer} isOpen={drawerIsShown} />
    </li>
  </ul>
  <SideDrawer isOpen={drawerIsShown} on:toggle={toggleDrawer} {hamburger} />
</nav>

<style>
  @media screen and (min-width: 701px) {
    nav {
      display: none;
    }
  }

  :global(body div.app:not(.fullscreen)) {
    /*
    - The env() makes sure that the mobile menu is not obscured
    by the screen switcher toggle in the iOS PWA.
    - The 0.7 scale here is because the inset is exaggerated for the bottom window switcher on iOS PWA.
    */
    --height-mobile-nav: calc(7rem + env(safe-area-inset-bottom, 0) * 0.7);
  }
  :global(body div.app.fullscreen) {
    --height-mobile-nav: 0rem;
  }

  nav {
    width: 100%;
    height: var(--height-mobile-nav);
    position: fixed;
    bottom: 0;
    left: 0;
    background-color: var(--color-white);
    font-size: 1.4rem;
    z-index: 120;
  }

  .main {
    position: relative;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    height: 100%;
    padding: 0.8rem 0 max(calc(env(safe-area-inset-bottom, 0.8rem) * 0.7), 0.8rem) 0;
    background-color: var(--color-white);
    z-index: 121;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
  }

  .main li:not(.hamburger) {
    height: 100%;
  }
  .main li a {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    outline: 0;
    position: relative;
    font-weight: 500;
    font-size: 1.4rem;
  }

  .main li a:after {
    content: '';
    position: absolute;
    bottom: -0.4rem;
    left: calc(50% - 0.25rem);
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: var(--color-orange);
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
  }

  .main li a.active:after {
    opacity: 1;
  }

  .main li a :global(i) {
    width: 4.5rem;
    height: 3.5rem;
  }
</style>
