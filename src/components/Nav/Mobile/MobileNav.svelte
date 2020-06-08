<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import { user } from '@/stores/auth';

  let condition = false;

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
      <a href={routes.HOME} class:active={$isActive('/index')}>Home</a>
    </li>
    <li>
      <a href={routes.MAP} class:active={$isActive(routes.MAP)}>Map</a>
    </li>
    {#if condition}
      <li>
        <a href={routes.CHAT} class:active={$isActive(routes.CHAT)}>Conversations</a>
      </li>
      <li>
        <a href={routes.ACCOUNT} class:active={$isActive(routes.ACCOUNT)}>{$user.firstName}</a>
      </li>
    {:else}
      <li>
        <a href={routes.SIGN_IN} class:active={$isActive(routes.SIGN_IN)}>Sign in</a>
      </li>
    {/if}
  </ul>
  <ul class="in-drawer">
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
    --height-nav: 8.6rem;
    width: 100%;
    position: aboluse;
  }

  .in-drawer {
    display: none;
  }

  .sign-out {
    color: var(--color-orange);
  }
</style>
