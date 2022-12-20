<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import Tile from './Tile.svelte';

  export let tiles: ComponentProps<Tile>[];
</script>

<div>
  {#each tiles as tile}
    <Tile {...tile} />
  {/each}
</div>

<style>
  div {
    display: flex;
    justify-content: center;
    gap: 2rem;
    width: 100%;
  }

  @media only screen and (max-width: 800px) {
    div {
      flex-direction: column;
    }
  }
</style>
