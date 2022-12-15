<script lang="ts">
  export let caption: string | undefined = undefined;
</script>

<div>
  {#if caption}
    <span>{caption}</span>
  {/if}
  <span />
  <h1><slot /></h1>
</div>

<style>
  span {
    color: var(--color-orange);
    text-transform: uppercase;
    letter-spacing: 0.1rem;
  }
</style>
