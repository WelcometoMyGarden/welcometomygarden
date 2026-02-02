<script lang="ts">
  import ViteSVG from './ViteSVG.svelte';

  interface Props {
    /**
     * Expected to be a direct HTML string of an svg
     */
    logo: string | undefined;
    /**
     * The link to an <img> src (alternative to the "logo" prop)
     */
    src: string | undefined;
    link: string;
    name: string;
  }

  let { logo, src, link, name }: Props = $props();
</script>

<a href={link} class="partner-link" target="_blank" aria-label={name}>
  {#if logo}
    <ViteSVG icon={logo}></ViteSVG>
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
