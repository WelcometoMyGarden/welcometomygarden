<script lang="ts">
  import { onMount } from 'svelte';
  import MapNotice from './MapNotice.svelte';
  import type maplibregl from 'maplibre-gl';
  import { checkIcon } from '$lib/images/icons';
  import { Icon } from '../UI';

  export let isShown = true;
  export let goToCurrentLocation: (() => void) | undefined = undefined;
  export let isAutoloadingLocation: boolean;
</script>

<MapNotice bind:show={isShown}>
  {#if isAutoloadingLocation}
    Finding your location...
  {:else}
    <Icon icon={checkIcon} inline />
    <button on:click={() => goToCurrentLocation && goToCurrentLocation()}>Go to my location</button>
  {/if}
</MapNotice>

<style>
  button {
    font-size: 1.6rem;
    pointer-events: initial;
    cursor: pointer;
    border: none;
    background: unset;
    text-decoration: underline;
  }
</style>
