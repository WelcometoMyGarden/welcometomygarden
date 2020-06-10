<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import NavLink from './NavLink.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { user } from '@/stores/auth';
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
    {#if $user}
      <UserDropdown name={$user.firstName} />
    {:else}
      <li>
        <NavLink href={routes.SIGN_IN}>Sign in</NavLink>
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
    z-index: 100;
  }

  .title {
    display: flex;
    align-items: center;
    background-image: url(/images/logo-emblem.svg);
    background-repeat: no-repeat;
    background-position: left 50%;
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
    background-color: var(--color-white);
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

  @media screen and (max-width: 1200px) {
    nav {
      --height-nav: 5.5rem;
      padding-left: 3rem;
    }
    nav > ul {
      padding-right: 3rem;
    }
    nav > ul > li {
      margin-left: 2.8rem;
    }
    h1 {
      font-size: 2rem;
      padding-left: 2rem;
    }
    .title {
      background-position: left 50%;
      background-size: 6rem auto;
      padding-left: 6rem;
    }
  }

  @media screen and (max-width: 1100px) {
    nav {
      padding-left: 2rem;
    }
    nav > ul {
      padding-right: 2rem;
    }
    h1 {
      display: none;
    }
  }

  @media screen and (max-width: 700px) {
    nav {
      display: none;
    }
  }
</style>
