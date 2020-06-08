<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import NavLink from './NavLink.svelte';

  const displayName = 'Marie';
</script>

<nav>
  <a href={routes.HOME} class="title">
    <h1>
      {#if !$isActive('/index')}Welcome to my Garden{/if}
    </h1>
  </a>
  <ul>
    <li>
      <NavLink href={routes.HOME}>Home</NavLink>
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
    <li>
      <NavLink href={routes.LOGIN}>Sign in</NavLink>
    </li>
    <li class="user">
      <button class="button-container user-button">
        <div class="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <span>{displayName}</span>
      </button>
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
    padding-left: 9rem;
    font-size: 2.2rem;
  }

  nav > ul {
    display: flex;
    align-items: center;
    box-shadow: 0 0 3.3rem rgba(0, 0, 0, 0.1);
    height: 100%;
    padding-right: 5rem;
  }

  nav > ul li {
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
    min-width: 10rem;
    height: 4.5rem;
    box-shadow: 0px 0px 3.3rem rgba(0, 0, 0, 0.1);
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
    background-color: var(--color-green-light);
    border-radius: 50%;
    margin-right: 1rem;
    font-weight: bold;
  }
</style>
