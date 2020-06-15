<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import { logout } from '@/api/auth';
  import { user } from '@/stores/auth';
  import { clickOutside } from '@/util';
  import { tentIcon, mapIcon, chatIcon, signInIcon, userIcon } from '@/images/icons';
  import Hamburger from './Hamburger.svelte';
  import Socials from '@/components/Socials.svelte';

  let hamburger;
  let drawerIsShown = false;
  const toggleDrawer = () => (drawerIsShown = !drawerIsShown);

  const handleClickOutsideDrawer = event => {
    const { clickEvent } = event.detail;
    // if (node.contains(event.target)) console.log('yup');
    if (drawerIsShown && !hamburger.contains(clickEvent.target)) toggleDrawer();
  };

  const linksInDrawer = [
    { route: routes.RULES, name: 'Rules' },
    { route: routes.FAQ, name: 'Frequently asked questions' },
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
    {#if $user}
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
      <Hamburger bind:hamburger on:click={toggleDrawer} isOpen={drawerIsShown} />
    </li>
  </ul>
  <div class:shown={drawerIsShown} class="overlay" />
  <ul
    class="drawer"
    class:open={drawerIsShown}
    use:clickOutside
    on:click-outside={handleClickOutsideDrawer}>
    {#each linksInDrawer as { route, name } (route)}
      <li>
        <a href={route} on:click={toggleDrawer} class:active={$isActive(route)}>{name}</a>
      </li>
    {/each}
    <li class="separated sign-out">
      <a
        href="/"
        on:click={() => {
          toggleDrawer();
          logout();
        }}>
        Sign out
      </a>
    </li>
    <div class="socials">
      <Socials small />
    </div>
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
    position: fixed;
    bottom: 0;
    left: 0;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    background-color: var(--color-white);
    font-size: 1.4rem;
    z-index: 120;
    padding: 0.8rem 0;
  }

  .overlay {
    width: 100%;
    height: calc(100vh - var(--height-nav));
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
    font-weight: 600;
    font-size: 1.4rem;
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

  .drawer {
    background-color: var(--color-white);
    height: calc(100vh - var(--height-nav));
    width: 25rem;
    position: fixed;
    top: 0;
    right: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    -webkit-font-smoothing: antialiased;
    padding: 8rem 2.5rem 0 1.5rem;
    transition: transform 0.3s cubic-bezier(0.77, 0.2, 0.05, 1);
    transform-origin: 0% 0%;
    transform: translate(100%, 0);
  }

  .drawer.open {
    transform: scale(1, 1);
    opacity: 1;
  }

  .drawer li {
    margin-top: 2rem;
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

  .icon-small {
    transform: scale(1.2);
  }

  .sign-out {
    color: var(--color-orange);
  }

  .socials {
    padding: 0 1.5rem;
    width: 100%;
    position: absolute;
    top: 1.5rem;
    right: 0;
  }
</style>
