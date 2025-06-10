<script lang="ts">
  export let caption: string | undefined = undefined;
  export let id: string | undefined = undefined;
  export let centered = false;
</script>

<div class="heading" class:centered>
  {#if caption}
    <span class="caption" {id}>{caption}</span>
  {/if}
  <span />
  <h2><slot /></h2>
</div>

<style>
  span {
    margin-bottom: 1.2rem;
    display: inline-block;
  }

  .centered {
    margin: 0 auto;
    text-align: center;
  }
</style>
