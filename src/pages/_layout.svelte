<script>
  import { onMount } from 'svelte';
  import { createAuthObserver } from '../api/auth';
  import { user, isInitializing } from '../stores/auth';
  import { PageContainer, Progress } from '../components/UI';
  import Nav from '../components/Nav/Navigation.svelte';

  onMount(() => {
    return createAuthObserver();
  });

  $: console.log($user);
</script>

<Progress active={$isInitializing} />

{#if !$isInitializing}
  <Nav />
  <PageContainer>
    <slot />
  </PageContainer>
{/if}
