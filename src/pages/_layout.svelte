<script>
  import { user, isInitializing } from '../stores/auth';
  import PageContainer from '../components/UI/PageContainer.svelte';
  import Nav from '../components/Nav/Navigation.svelte';
  import Progress from '../components/UI/Progress.svelte';

  $: console.log($user);
</script>

<Progress active={$isInitializing} />

{#if !$isInitializing}
  <Nav />
  <PageContainer>
    <slot />
  </PageContainer>
{/if}
