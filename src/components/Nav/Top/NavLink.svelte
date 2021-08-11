<script>
  export let href;
  // is this a little nasty? yes
  // until routify handles index routes a little more consistently, it's here to stay
  export let isHome = false;
  export let target;

  import { isActive } from '@roxi/routify';
</script>

<a {href} on:click class:active={isHome ? $isActive('/index') : $isActive(href)} {target} on:click>
  <slot />
</a>

<style>
  a {
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
    bottom: 0;
    content: '';
    display: block;
    height: 2px;
    left: 50%;
    position: absolute;
    background: var(--color-green);
    transition: width 0.3s ease 0s, left 0.3s ease 0s;
    width: 0;
  }

  a.active:after,
  a:focus:after,
  a:hover:after {
    width: 100%;
    left: 0;
  }
</style>
