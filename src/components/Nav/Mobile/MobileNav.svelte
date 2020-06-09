<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import { user } from '@/stores/auth';
  import { tentIcon, mapIcon, chatIcon, signInIcon, userIcon } from '@/images/icons';
  import Hamburger from './Hamburger.svelte';

  let condition = false;

  let drawerIsShown = false;
  const toggleDrawer = () => (drawerIsShown = !drawerIsShown);

  const linksInDrawer = [
    { route: routes.RULES, name: 'Rules' },
    { route: routes.FAQ, name: 'Frequently asked questions' },
    { route: routes.COPYRIGHT, name: 'Copyright' },
    { route: routes.COOKIE_POLICY, name: 'Cookie policy' },
    { route: routes.PRIVACY_POLICY, name: 'Privacy policy' },
    { route: routes.TERMS_OF_USE, name: 'Terms of use' }
  ];
</script>

<nav>
  <ul class="main">
    <li>
      <a href={routes.HOME} class:active={$isActive('/index')}>
        <i>
          {@html tentIcon}
        </i>
        <span>Home</span>
      </a>
    </li>
    <li>
      <a href={routes.MAP} class:active={$isActive(routes.MAP)}>
        <i>
          {@html mapIcon}
        </i>
        Map
      </a>
    </li>
    {#if condition}
      <li>
        <a href={routes.CHAT} class:active={$isActive(routes.CHAT)}>
          <i class="icon-small">
            {@html chatIcon}
          </i>
          Chat
        </a>
      </li>
      <li>
        <a href={routes.ACCOUNT} class:active={$isActive(routes.ACCOUNT)}>
          <i class="icon-small">
            {@html userIcon}
          </i>
          {$user.firstName}
        </a>
      </li>
    {:else}
      <li>
        <a href={routes.SIGN_IN} class:active={$isActive(routes.SIGN_IN)}>
          <i>
            {@html signInIcon}
          </i>
          Sign in
        </a>
      </li>
    {/if}
    <li class="hamburger">
      <Hamburger on:click={toggleDrawer} isOpen={drawerIsShown} />
    </li>
  </ul>
  <ul class="drawer">
    {#each linksInDrawer as { route, name } (route)}
      <li>
        <a href={route} class:active={$isActive(route)}>{name}</a>
      </li>
    {/each}
    <li class="separated sign-out">Sign out</li>
  </ul>
</nav>

<style>
  @media screen and (min-width: 700px) {
    nav {
      display: none;
    }
  }

  nav {
    width: 100%;
    --height-nav: 9rem;
    height: var(--height-nav);
    position: absolute;
    bottom: 0;
    left: 0;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    background-color: var(--color-white);
    font-size: 1.4rem;
    z-index: 100;
    padding: 0.8rem 0;
  }

  .main {
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    height: 100%;
  }

  .main li:not(.hamburger) {
    height: 100%;
  }

  .main li a {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    outline: 0;
    position: relative;
  }

  .main li i {
    height: 75%;
    display: flex;
    align-items: center;
    position: relative;
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

  .icon-small {
    transform: scale(1.2);
  }

  .drawer {
    display: none;
  }

  .sign-out {
    color: var(--color-orange);
  }
</style>
