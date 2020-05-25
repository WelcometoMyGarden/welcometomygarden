<script>
  export let href;
  export let isInDrawer = true;

  import { isActive } from '@sveltech/routify';
</script>

<a {href} class:mobile-nav-link={isInDrawer} class:active={$isActive('/')}>
  <slot />
</a>

<style>
  a {
    color: var(--color-black);
    /* this is fine since focus styles are applied for tab indexing */
    outline: 0;
    transition: color 0.3s ease;
  }

  a,
  a:visited,
  a:active,
  a:hover {
    text-decoration: none;
  }

  a:after {
    background: none repeat scroll 0 0 transparent;
    bottom: -0.4rem;
    content: '';
    display: block;
    height: 2px;
    left: 50%;
    position: absolute;
    background: var(--nav-color);
    transition: width 0.3s ease 0s, left 0.3s ease 0s;
    width: 0;
  }

  a.active:after,
  a:focus:after,
  a:hover:after {
    width: 100%;
    left: 0;
  }

  @media (max-width: 1024px) {
    .mobile-nav-link:after {
      display: none;
    }

    .mobile-nav-link.active,
    .mobile-nav-link:focus,
    .mobile-nav-link:hover {
      color: var(--color-light-blue);
    }
  }
</style>
