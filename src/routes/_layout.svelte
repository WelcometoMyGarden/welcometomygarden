<script>
  import { onMount } from 'svelte';

  import Nav from '../components/Nav/Navigation.svelte';

  export let segment;

  let ready = false;

  onMount(() => (ready = true));
</script>

<div class="container">
  <Nav {segment} />
  {#if ready}
    <main>
      <slot />
    </main>
  {/if}
</div>

<style lang="scss" global>
  @import '../vendor/global.scss';

  .container {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    margin-top: var(--height-nav);
    padding: 2.5rem 5rem;
  }
</style>
