<script lang="ts">
  export let href: string;
  export let newtab: boolean | undefined = undefined;
</script>

<!-- @component
Simple anchor link component, mostly to avoid repeated styling -->
<a {href} target={newtab ? '_blank' : undefined} rel="noopener"><slot /></a>

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
