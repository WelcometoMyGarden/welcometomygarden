<script>
  import { user, isLoggingIn } from '../data/auth';
  import PageContainer from '../components/UI/PageContainer.svelte';
  import Nav from '../components/Nav/Navigation.svelte';
  import Progress from '../components/UI/Progress.svelte';

  $: console.log($user);
</script>

<Progress active={$isLoggingIn} />

{#if !$isLoggingIn}
  <Nav />
  <PageContainer>
    <slot />
  </PageContainer>
{/if}
