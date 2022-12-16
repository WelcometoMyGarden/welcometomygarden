<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import NavLink from './NavLink.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { user } from '@/lib/stores/auth';
  import WtmgLogo from '../../UI/WTMGLogo.svelte';
  import { SLOWBY_URL } from '@/lib/constants';

  $: firstName = $user ? $user.firstName : '';
</script>

<nav>
  <div class="nav-extra">
    <span
      >Need help planning a trip? Check our <a
        class="link"
        style:color="inherit"
        href={SLOWBY_URL}
        target="_blank"
        rel="noopener">Slowby Secret Trips</a
      ></span
    >
  </div>
  <div class="main-nav">
    <WtmgLogo hideTitleWhenOnHome />
    <ul>
      <li>
        <NavLink href={routes.MAP}>{$_('generics.map')}</NavLink>
      </li>
      <li>
        <NavLink href={routes.RULES}>{$_('generics.rules')}</NavLink>
      </li>
      <!-- TODO reuse this language key in the footer -->
      <!-- But create a new key -->
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
  </div>
</nav>

<style>
  :global(body) {
    --height-nav-main: 7rem;
    --height-nav-extra: 3.5rem;
    --height-nav: calc(var(--height-nav-extra) + var(--height-nav-main));
  }

  nav {
    position: fixed;
    top: 0;
    left: 0;
    height: var(--height-nav);
    width: 100%;
    display: flex;
    flex-direction: column;
    z-index: 110;
    background-color: var(--color-white);
    box-shadow: 0 0 3.3rem rgba(0, 0, 0, 0.1);
  }

  nav > .main-nav {
    flex: 1;
    padding: 0 0 0 5rem;
    justify-content: space-between;
  }

  nav .nav-extra {
    background-color: var(--color-beige-light);
    text-align: right;
    height: var(--height-nav-extra);
    display: flex;
    justify-content: right;
    align-items: center;
    padding: 0 1.5rem;
  }

  nav .main-nav {
    display: flex;
    align-items: center;
  }

  nav .main-nav > ul {
    display: flex;
    align-items: center;
    height: 100%;
    padding-right: 5rem;
  }

  nav > .main-nav > ul > li {
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
    /* :global() {
      --height-nav: 10.5rem;
    } */
    nav > .main-nav {
      padding-left: 3rem;
    }
    nav > .main-nav > ul {
      padding-right: 3rem;
    }
    nav > .main-nav > ul > li {
      margin-left: 2.8rem;
    }
  }

  @media screen and (max-width: 1200px) {
    nav > .main-nav {
      padding-left: 2rem;
    }
    nav > .main-nav > ul {
      padding-right: 2rem;
    }
  }

  @media screen and (max-width: 850px) {
    nav > .main-nav {
      padding-left: 1.5rem;
    }
    nav > .main-nav > ul {
      padding-right: 1.5rem;
    }
    nav > .main-nav > ul > li {
      margin-left: 1rem;
      min-width: 7rem;
    }
  }

  @media screen and (max-width: 700px) {
    nav {
      display: none;
    }
    /* Reset height top nav bar */
    :global(body) {
      --height-nav-main: 0px;
      --height-nav-extra: 0px;
    }
  }
</style>
