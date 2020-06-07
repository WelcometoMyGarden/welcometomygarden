<script>
  import { isActive, page } from '@sveltech/routify';
  import routes from '@/routes';

  console.log($page);
</script>

<nav>
  <a href={routes.HOME} class="title">
    <h1>
      {#if !$isActive('./index')}Welcome to my Garden{/if}
    </h1>
  </a>
  <ul>
    <li>
      <a href={routes.HOME}>Home</a>
    </li>
    <li />
    <li>
      <a href={routes.MAP}>Map</a>
    </li>
    <li>
      <a href={routes.RULES}>Rules</a>
    </li>
    <li>
      <a href={routes.FAQ}>FAQ</a>
    </li>
    <li>
      <a href={routes.LOGIN}>Sign in</a>
    </li>
  </ul>
</nav>

<style>
  nav {
    display: flex;
    align-items: center;
    height: var(--height-nav);
    justify-content: space-between;
    padding: 0 5rem;
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
  }
</style>
