<script>
  import { onMount } from 'svelte';

  import Nav from '../components/Nav/Navigation.svelte';

  export let segment;

  let ready = false;

  onMount(() => (ready = true));
</script>

<Nav {segment} />

{#if ready}
  <main>
    <slot />
  </main>
{/if}

<style lang="scss" global>
  @import '../vendor/global.scss';
</style>
