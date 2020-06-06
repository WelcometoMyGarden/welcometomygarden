<script>
  import { user } from '../data/auth';
  import Nav from '../components/Nav/Navigation.svelte';

  $: console.log($user);
</script>

<div>
  <Nav />
  <slot />
</div>

<style>
  div {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
</style>
