<script>
  import { slide } from 'svelte/transition';
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import NavLink from './NavLink.svelte';
  import { logout } from '@/api/auth';
  import { clickOutside } from '@/util';

  import { conversationsIcon, signOutIcon, userIcon } from '@/images/icons';

  let dropdown;
  let isUserDropdownOpen = false;
  const toggleUserDropdown = () => {
    isUserDropdownOpen = !isUserDropdownOpen;
  };

  const handleClickOutsideDropdown = () => {
    if (isUserDropdownOpen) toggleUserDropdown();
  };

  const displayName = 'Marie';
</script>

<nav>
  <a href={routes.HOME} class="title">
    <h1>
      {#if !$isActive('/index')}Welcome To My Garden{/if}
    </h1>
  </a>
  <ul>
    <li>
      <NavLink href={routes.HOME} isHome>Home</NavLink>
    </li>
    <li>
      <NavLink href={routes.MAP}>Map</NavLink>
    </li>
    <li>
      <NavLink href={routes.RULES}>Rules</NavLink>
    </li>
    <li>
      <NavLink href={routes.FAQ}>FAQ</NavLink>
    </li>

    <li class="user" use:clickOutside on:click-outside={handleClickOutsideDropdown}>
      <button class="button-container user-button" on:click={toggleUserDropdown}>
        <div class="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <span>{displayName}</span>
      </button>
      {#if isUserDropdownOpen}
        <ul transition:slide={{ duration: 300 }} class="user-dropdown" bind:this={dropdown}>
          <li>
            <a href={routes.CHAT} on:click={toggleUserDropdown}>
              <i>
                {@html conversationsIcon}
              </i>
              Conversations
            </a>
          </li>
          <li>
            <a href={routes.CHAT} on:click={toggleUserDropdown}>
              <i>
                {@html userIcon}
              </i>
              My WTMG
            </a>
          </li>
          <li class="separated">
            <a
              href={routes.HOME}
              on:click={() => {
                toggleUserDropdown();
                logout();
              }}>
              <i>
                {@html signOutIcon}
              </i>
              Sign out
            </a>
          </li>
        </ul>
      {/if}
    </li>
  </ul>
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    height: var(--height-nav);
    justify-content: space-between;
    padding: 0 0 0 5rem;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 100;
    position: relative;
  }

  .title {
    display: flex;
    align-items: center;
    background-image: url(/images/logo-emblem.svg);
    background-repeat: no-repeat;
    background-position: left 40%;
    background-size: 7rem auto;
    height: 100%;
  }

  h1 {
    padding-top: 1.6rem;
    padding-left: 8.5rem;
    font-size: 2.3rem;
    font-weight: 900;
  }

  nav > ul {
    display: flex;
    align-items: center;
    box-shadow: 0 0 3.3rem rgba(0, 0, 0, 0.1);
    height: 100%;
    padding-right: 5rem;
    background-color: var(--color-white);
  }

  nav > ul > li {
    font-weight: 600;
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: 8rem;
    text-align: center;
    margin-left: 4rem;
  }

  .user {
    --dropdown-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    min-width: 10rem;
    height: 4.5rem;
    box-shadow: var(--dropdown-shadow);
    font-weight: 600;
    background-color: var(--color-white);
    border-radius: 3rem;
  }

  .user-button {
    border: 1px solid transparent;
    transition: border 300ms ease-out;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 2rem;
  }

  .user-button:hover,
  .user-button:focus,
  .user-button:active {
    border: 1px solid var(--color-green);
  }

  .user-avatar {
    width: 2.8rem;
    height: 2.8rem;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--color-white);
    background-color: var(--color-green);
    border-radius: 50%;
    margin-right: 1rem;
    font-weight: bold;
  }

  .user-dropdown {
    position: absolute;
    z-index: 110;
    top: calc(var(--height-nav) - 1.5rem);
    right: 0;
    width: 21rem;
    padding: 2.4rem 1rem;
    background-color: var(--color-white);
    box-shadow: var(--dropdown-shadow);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: space-between;
    border-radius: 0.6rem;
  }

  .user-dropdown li {
    width: 100%;
    text-align: left;
    padding-left: 2rem;
    margin-bottom: 2rem;
  }

  .user-dropdown li a {
    display: flex;
    align-items: center;
  }

  .user-dropdown li i {
    margin-right: 1rem;
    width: 2.4rem;
    display: flex;
    align-items: center;
  }

  .user-dropdown .separated {
    padding-top: 1.5rem;
    border-top: 1px solid var(--color-green);
    margin-bottom: 0;
  }
</style>
