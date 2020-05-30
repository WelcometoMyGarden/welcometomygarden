<script>
  import { user } from '../data/auth';
  import Nav from '../components/Nav/Navigation.svelte';

  $: console.log($user);
</script>

<Nav />
<slot />

<style lang="scss" global>
  @import '../vendor/global.scss';
</style>
