<script>
  import { user } from '../data/auth';
  import PageContainer from '../components/UI/PageContainer.svelte';
  import Nav from '../components/Nav/Navigation.svelte';

  $: console.log($user);
</script>

<Nav />
<PageContainer>
  <slot />
</PageContainer>
