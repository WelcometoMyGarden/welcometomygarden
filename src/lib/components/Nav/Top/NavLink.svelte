<script lang="ts">
  import { page } from '$app/stores';
  import { isActive, isActiveContains } from '@/lib/util/isActive';

  export let href: string;
  // is this a little nasty? yes
  // until routify handles index routes a little more consistently, it's here to stay
  export let isHome = false;
  export let target: string | undefined = undefined;
  export let rel: string | undefined = undefined;
  export let highlighted: boolean | undefined = undefined;
</script>

<a
  {href}
  {rel}
  class:active={isHome ? isActive($page, '/') : isActiveContains($page, href)}
  class:highlighted={!!highlighted}
  {target}
  on:click
>
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
  a:active {
    text-decoration: none;
  }

  a:hover {
    text-decoration: none;
  }

  /* Underline with animation when hovered/active */
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

  a.active {
    font-weight: 600;
  }

  a.active:after,
  a:focus:after,
  a:hover:after {
    width: 100%;
    left: 0;
  }

  a.highlighted:not(.active) {
    /*
      This top border is a hack to keep the title centered while it is highlighted.
      It is normally centered in the <li> around it, but pushed off center when
      the bottom border gets added, which increases the height of the link compared ot the other links.
      This top border "balances out" the change of the bottom border.

      Approaches with `transform: translateY(1px)` are not helpful here, because they seem to
      mess up the alignment of the active underline, which is normally
      absolutely positioned relative to the <li> (position: relative), but becomes positioned
      relative to the <a> itself when a transform is used.
     */
    border-top: 2px solid transparent;
    border-bottom: 2px solid var(--color-orange-light);
    transition: all 0.3s ease;
  }
</style>
