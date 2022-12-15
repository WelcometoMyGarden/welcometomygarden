<script lang="ts">
  export let logo: string;
  export let link: string;
  export let name: string;
</script>

<a href={link} class="partner-link" target="_blank" aria-label={name}>
  {@html logo}
</a>

<style>
  .partner-link {
    display: block;
    width: min-content;
  }

  .partner-link :global(svg) {
    fill: var(--color-orange-light);
    max-width: 18rem;
    min-width: 16rem;
    max-height: 10rem;
  }
</style>
