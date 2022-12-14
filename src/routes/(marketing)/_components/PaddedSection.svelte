<script lang="ts">
  export let desktopOnly: boolean | undefined = undefined;
  export let vertical: boolean | undefined = undefined;
  export let backgroundColor: string | undefined = undefined;

  const elementOptions = ['section', 'footer'] as const;
  type Option = typeof elementOptions[number];
  export let is: Option = 'section';
</script>

<svelte:element this={is} class:desktopOnly class:vertical style:background-color={backgroundColor}>
  <div class="inner">
    <slot />
  </div>
</svelte:element>

<style>
  div.inner {
    padding-left: 6rem;
    padding-right: 6rem;
    margin: auto;
    max-width: 1200px;
  }

  .vertical {
    padding-top: 6rem;
    padding-bottom: 6rem;
  }

  @media only screen and (max-width: 600px) {
    .inner {
      padding: 0 2rem;
    }
    .desktopOnly .inner {
      padding: 0;
    }
  }
</style>
