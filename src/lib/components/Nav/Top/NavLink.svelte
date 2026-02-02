<script lang="ts">
  import { currentRoute } from '$lib/routes';

  interface Props {
    href: string;
    target?: string | undefined;
    rel?: string | undefined;
    highlighted?: boolean | undefined;
    onclick?: (e: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    href,
    target = undefined,
    rel = undefined,
    highlighted = undefined,
    children,
    onclick
  }: Props = $props();
</script>

<!-- The href check below works because internal href links
 in the top navbar always correspond to a their $currentRoute -->
<a
  {href}
  {rel}
  class:active={href.endsWith($currentRoute ?? 'never')}
  class:highlighted={!!highlighted}
  {target}
  {onclick}
>
  {@render children?.()}
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
    transition:
      width 0.3s ease 0s,
      left 0.3s ease 0s;
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
