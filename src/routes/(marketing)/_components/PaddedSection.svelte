<script lang="ts">
  /**
   * Whether to only include padding on desktop
   */
  export let desktopOnly: boolean | undefined = undefined;
  export let vertical: boolean | undefined = undefined;
  export let backgroundColor: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let centered: boolean | undefined = undefined;
  /**
   * Whether to wrap this section in a nosnippet section, see https://developers.google.com/search/docs/crawling-indexing/special-tags#data-nosnippet
   * Note: any value, truthy or falsy, enables the "nosnippet" behavior.
   */
  export let nosnippet: boolean = false;
  /**
   * Whether this is the topmost section (omit top)
   */
  export let topMargin = true;
  const elementOptions = ['section', 'footer'] as const;
  type Option = (typeof elementOptions)[number];
  export let is: Option = 'section';
  export let className: string | undefined = undefined;
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
    <slot />
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
