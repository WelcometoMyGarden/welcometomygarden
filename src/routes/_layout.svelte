<script>
  import Nav from '../components/Nav/Navigation.svelte';

  export let segment;
</script>

<Nav {segment} />

<main>
  <slot />
</main>

<style>
  main {
    margin: 0;
    padding: 0;
  }
</style>
