<script lang="ts">
  export let name: string;

  import { _ } from 'svelte-i18n';
  import { slide } from 'svelte/transition';
  import { clickOutside } from '$lib/directives';
  import { logout } from '$lib/api/auth';
  import { chatIcon, signOutIcon, userIcon } from '$lib/images/icons';
  import routes from '$lib/routes';
  import { goto } from '$lib/util/navigate';

  let isOpen = false;

  const toggleOpen = () => (isOpen = !isOpen);

  const handleClickOutsideDropdown = () => {
    if (isOpen) toggleOpen();
  };
</script>

<li class="user" use:clickOutside on:click-outside={handleClickOutsideDropdown}>
  <button class="button-container user-button" on:click={toggleOpen}>
    <div class="user-avatar">{name.charAt(0).toUpperCase()}</div>
    <span>{name}</span>
  </button>
  {#if isOpen}
    <ul transition:slide={{ duration: 300 }} class="user-dropdown">
      <li>
        <a href={routes.CHAT} on:click={toggleOpen}>
          <i>
            {@html chatIcon}
          </i>
          {$_('generics.chat')}
        </a>
      </li>
      <li>
        <a href={routes.ACCOUNT} on:click={toggleOpen}>
          <i>
            {@html userIcon}
          </i>
          {$_('generics.account')}
        </a>
      </li>
      <li class="separated">
        <a
          href={routes.HOME}
          on:click|preventDefault={async () => {
            toggleOpen();
            await logout();
            goto(routes.HOME);
          }}
        >
          <i>
            {@html signOutIcon}
          </i>
          {$_('generics.sign-out')}
        </a>
      </li>
    </ul>
  {/if}
</li>

<style>
  .user {
    --dropdown-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
    min-width: 10rem;
    height: 4.5rem;
    box-shadow: var(--dropdown-shadow);
    font-weight: 600;
    background-color: var(--color-white);
    border-radius: 3rem;
    position: relative;
    margin-left: 4rem;
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
    width: 3rem;
    height: 3rem;
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
    z-index: 120;
    top: 130%;
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
    font-weight: 500;
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

  @media screen and (max-width: 1200px) {
    .user-button {
      padding: 0 1rem;
    }

    .user-avatar {
      width: 2.5rem;
      height: 2.5rem;
      font-size: 1.4rem;
    }
    .user {
      height: 3.5rem;
      margin-left: 2.8rem;
    }
  }
</style>
