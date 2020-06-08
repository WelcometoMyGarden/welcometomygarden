<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import NavLink from './NavLink.svelte';
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

  nav ul {
    display: flex;
    align-items: center;
    box-shadow: 0 0 3.3rem rgba(0, 0, 0, 0.1);
    height: 100%;
    padding-right: 8rem;
  }

  nav ul li {
    margin-left: 8rem;
    font-weight: 600;
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
</style>
