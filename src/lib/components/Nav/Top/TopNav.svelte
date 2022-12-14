<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import NavLink from './NavLink.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { user } from '@/lib/stores/auth';
  import WtmgLogo from '../../UI/WTMGLogo.svelte';

  $: firstName = $user ? $user.firstName : '';
</script>

<nav>
  <WtmgLogo hideTitleWhenOnHome />
  <ul>
    <li>
      <NavLink href={routes.MAP}>{$_('generics.map')}</NavLink>
    </li>
    <li>
      <NavLink href={routes.RULES}>{$_('generics.rules')}</NavLink>
    </li>
    <!-- TODO reuse this language key in the footer -->
    <!-- <li>
      <NavLink href={$_('index.slowby.banner.url')} target="_blank" rel="noreferrer"
        >{$_('generics.slowby')}</NavLink
      >
    </li> -->
    <li>
      <NavLink href={routes.ABOUT_US}>About Us</NavLink>
    </li>
    <li>
      <NavLink href={routes.BECOME_SUPERFAN} highlighted>Become a Superfan</NavLink>
    </li>
    {#if firstName}
      <UserDropdown name={firstName || ''} />
    {:else}
      <li>
        <NavLink href={routes.SIGN_IN}>{$_('generics.sign-in')}</NavLink>
      </li>
    {/if}
  </ul>
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    height: var(--height-nav);
    justify-content: space-between;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    padding: 0 0 0 5rem;
    z-index: 110;
    background-color: var(--color-white);
    box-shadow: 0 0 3.3rem rgba(0, 0, 0, 0.1);
  }

  nav > ul {
    display: flex;
    align-items: center;
    height: 100%;
    padding-right: 5rem;
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

  @media screen and (max-width: 1300px) {
    :global(body) {
      --height-nav: 5.5rem;
    }
    nav {
      padding-left: 3rem;
    }
    nav > ul {
      padding-right: 3rem;
    }
    nav > ul > li {
      margin-left: 2.8rem;
    }
  }

  @media screen and (max-width: 1200px) {
    nav {
      padding-left: 2rem;
    }
    nav > ul {
      padding-right: 2rem;
    }
  }

  @media screen and (max-width: 850px) {
    nav {
      padding-left: 1.5rem;
    }
    nav > ul {
      padding-right: 1.5rem;
    }
    nav > ul > li {
      margin-left: 1rem;
      min-width: 7rem;
    }
  }

  @media screen and (max-width: 700px) {
    nav {
      display: none;
    }
  }
</style>
