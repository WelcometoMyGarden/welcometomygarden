<script>
  import NavLink from './NavLink.svelte';
  import Hamburger from './Hamburger.svelte';
  import { Button } from '../UI';
  import { user, logout } from '../../data/auth';

  /* any transition or animation to do with sizing will trigger on page load and browser
   resize, we don't want that */
  let domIsAnimationReady = true;
  let resizeTimer;
  const preventAnimation = () => {
    domIsAnimationReady = false;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      domIsAnimationReady = true;
    }, 400);
  };

  let isMobileNavShown = false;
  const toggleNav = () => (isMobileNavShown = !isMobileNavShown);
</script>

<svelte:window on:resize={preventAnimation} />

<header>
  <div class:shown={isMobileNavShown} on:click={toggleNav} class="overlay" />
  <Hamburger isOpen={isMobileNavShown} on:click={toggleNav} />
  <nav class:open={isMobileNavShown}>
    <h1>
      <NavLink isInDrawer={false} href="/">Welcome to my Garden!</NavLink>
    </h1>
    <ul class:transitionable={domIsAnimationReady}>
      {#if $user}
        <NavLink href="/" on:click={logout}>Log out</NavLink>
      {:else}
        <NavLink href="/login">Log in</NavLink>
      {/if}
      <li>
        <Button href="/add-garden" primary capitalize>Add your Garden</Button>
      </li>
    </ul>
  </nav>
</header>

<style>
  header {
    height: var(--height-nav);
    width: 100vw;
    background: rgba(255, 255, 255, 0.95);
    position: absolute;
    top: 0;
    left: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    flex-direction: row-reverse;
    align-items: center;
    padding: 0 5rem;
  }

  .overlay {
    width: 100%;
    height: 100vh;
    position: fixed;
    top: 0;
    bottom: 0;
    right: 200%;
    left: -100%;
    background-color: rgba(0, 0, 0, 0.8);
    z-index: 20;
    overflow: hidden;
    text-align: center;
    transition: top 0.3s, right 0.3s, bottom 0.3s, left 0.3s;
  }

  .overlay.shown {
    right: 0;
    left: 0;
  }

  nav {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  ul {
    height: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin: 0;
  }

  li {
    list-style-type: none;
    margin-left: 3rem;
    font-size: 1.8rem;
    position: relative;
  }

  h1 {
    margin: 0;
    display: inline-block;
  }

  @media (max-width: 980px) {
    header {
      height: var(--height-nav-mobile);
    }
    ul {
      position: fixed;
      top: 0;
      right: 0;
      width: 30rem;
      height: 100vh;
      padding: 0 3rem;
      padding-top: 8rem;
      background: var(--color-white);
      list-style-type: none;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-start;
      z-index: 20;

      /* stop text flickering in chromium browsers */
      -webkit-font-smoothing: antialiased;

      transform-origin: 0% 0%;
      transform: translate(100%, 0);
    }

    ul.transitionable {
      transition: transform 0.5s cubic-bezier(0.77, 0.2, 0.05, 1);
    }

    .open ul {
      transform: scale(1, 1);
      opacity: 1;
    }

    li {
      margin-left: 0;
      margin-bottom: 3rem;
    }
  }

  @media screen and (max-width: 568px) {
    h1 {
      font-size: 2rem;
    }
    header {
      padding: 0 2rem;
    }
  }
</style>
