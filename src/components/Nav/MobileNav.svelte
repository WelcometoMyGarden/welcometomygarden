<script>
  import { isActive } from '@sveltech/routify';
  import routes from '@/routes';
  import NavLink from './NavLink.svelte';
  import UserDropdown from './UserDropdown.svelte';
  import { user } from '@/stores/auth';
</script>

<nav />

<style>
  @media screen and (min-width: 700px) {
    nav {
      display: none;
    }
  }
</style>
