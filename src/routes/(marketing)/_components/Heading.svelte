<script lang="ts">
  export let caption: string | undefined = undefined;
  export let id: string | undefined = undefined;
</script>

<div class="heading">
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
</style>
