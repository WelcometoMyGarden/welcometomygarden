<script>
  import { onMount } from 'svelte';
  import { createAuthObserver } from '@/api/auth';
  import { user, isInitializing } from '../stores/auth';
  import { PageContainer, Progress } from '../components/UI';
  import Nav from '../components/Nav/Navigation.svelte';
  import Footer from '@/components/Footer.svelte';

  onMount(() => {
    return createAuthObserver();
  });

  $: console.log($user);
</script>

<div class="app">
  <Progress active={$isInitializing} />

  {#if !$isInitializing}
    <Nav />
    <PageContainer>
      <slot />
    </PageContainer>
    <Footer />
  {/if}
</div>

<style>
  .app {
    --height-nav: 7rem;
    --height-footer: 18rem;
    width: 100%;
    height: 100%;
    position: relative;
    padding-top: var(--height-nav);
  }

  @media screen and (max-width: 700px) {
    .app {
      padding-top: 0;
      padding-bottom: var(--height-nav);
    }
  }
</style>
