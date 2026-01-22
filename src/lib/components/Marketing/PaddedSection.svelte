<script lang="ts">
  const elementOptions = ['section', 'footer'] as const;
  type Option = (typeof elementOptions)[number];
  interface Props {
    /**
     * Whether to only include padding on desktop
     */
    desktopOnly?: boolean | undefined;
    vertical?: boolean | undefined;
    backgroundColor?: string | undefined;
    id?: string | undefined;
    centered?: boolean | undefined;
    /**
     * Whether to wrap this section in a nosnippet section, see https://developers.google.com/search/docs/crawling-indexing/special-tags#data-nosnippet
     * Note: any value, truthy or falsy, enables the "nosnippet" behavior.
     */
    nosnippet?: boolean;
    /**
     * Whether this is the topmost section (omit top)
     */
    topMargin?: boolean;
    is?: Option;
    className?: string | undefined;
    children?: import('svelte').Snippet;
  }

  let {
    desktopOnly = undefined,
    vertical = undefined,
    backgroundColor = undefined,
    id = undefined,
    centered = undefined,
    nosnippet = false,
    topMargin = true,
    is = 'section',
    className = undefined,
    children
  }: Props = $props();
</script>

<svelte:element
  this={is}
  class="outer {className || ''}"
  class:desktopOnly
  class:vertical
  class:topMargin
  style:background-color={backgroundColor}
  {id}
  {...nosnippet ? { 'data-nosnippet': true } : {}}
>
  <div class="inner" class:centered>
    {@render children?.()}
  </div>
</svelte:element>

<style>
  .outer {
    margin: var(--section-inner-padding) 0;
  }
  .inner {
    padding-left: var(--section-inner-padding);
    padding-right: var(--section-inner-padding);
    margin: auto;
    max-width: 1200px;
  }

  .outer:not(.topMargin) {
    margin-top: 0;
  }

  .centered {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .vertical {
    padding-top: var(--section-inner-padding);
    padding-bottom: var(--section-inner-padding);
  }

  /* No margin at the bottom of the page */
  footer.outer {
    margin-bottom: 0;
  }

  @media only screen and (max-width: 700px) {
    .inner {
      padding: 0 var(--spacing-small);
    }
    .desktopOnly .inner {
      padding: 0;
    }

    /* On mobile, there is no nav bar.
       The margin of the first section is then usually weird. */
    section.outer:first-child {
      margin-top: 0;
    }
  }
</style>
