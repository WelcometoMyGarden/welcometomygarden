<script lang="ts">
  /**
   * Expected to be a direct HTML string of an svg
   */
  export let logo: string | undefined;
  /**
   * The link to an <img> src (alternative to the "logo" prop)
   */
  export let src: string | undefined;
  export let link: string;
  export let name: string;
</script>

<a href={link} class="partner-link" target="_blank" aria-label={name}>
  {#if logo}
    {@html logo}
  {:else if src}
    <img {src} alt={name} />
  {/if}
</a>

<style>
  .partner-link {
    display: block;
    width: min-content;
  }

  .partner-link :global(svg),
  img {
    max-width: 18rem;
    min-width: 16rem;
    max-height: 10rem;
  }

  .partner-link :global(svg) {
    fill: var(--color-orange-light);
  }
</style>
