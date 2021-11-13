<script>
  export let logo;
  export let link;
  export let name;
</script>

<a href={link} class="partner-link" target="_blank" rel="noreferrer noopener" aria-label={name}>
  {@html logo}
</a>

<style>
  .partner-link {
    display: block;
    width: 100%;
  }

  .partner-link :global(svg) {
    fill: var(--color-orange-light);
    max-width: 18rem;
    max-height: 10rem;
  }
</style>
