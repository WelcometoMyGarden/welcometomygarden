<script lang="ts">
  import trackEvent from '$lib/util/track-plausible';

  interface Props {
    href: string;
    /**
     * Whether this should prevent the default href nav
     */
    preventing?: boolean;
    newtab?: boolean | undefined;
    track?: Parameters<typeof trackEvent> | undefined;
    onclick?: (event: MouseEvent) => void;
    children?: import('svelte').Snippet;
  }

  let {
    href,
    preventing = false,
    newtab = undefined,
    track = undefined,
    onclick,
    children
  }: Props = $props();

  const handleClick = (e: MouseEvent) => {
    if (preventing) {
      e.preventDefault();
    }
    if (track) {
      trackEvent(...track);
    }
    onclick?.(e);
  };
</script>

<!-- @component
Simple anchor link component, mostly to avoid repeated styling -->
<a {href} onclick={handleClick} target={newtab ? '_blank' : undefined} rel="noopener"
  >{@render children?.()}</a
>

<style>
  a,
  a:link,
  a:visited,
  a:active {
    cursor: pointer;
    color: var(--color-orange);
    text-decoration: underline;
  }

  a:hover {
    text-decoration: none;
  }
</style>
