<script>
  import { onMount } from 'svelte';
  import { createAuthObserver } from '@/api/auth';
  import { user, isInitializing } from '../stores/auth';
  import { Progress, Notifications } from '@/components/UI';
  import Nav from '../components/Nav/Navigation.svelte';
  import Footer from '@/components/Footer.svelte';

  onMount(() => {
    return createAuthObserver();
  });

  $: console.log($user);
</script>

<div class="app">
  <Progress active={$isInitializing} />
  <Notifications />

  {#if !$isInitializing}
    <Nav />
    <main>
      <slot />
    </main>
    <Footer />
  {/if}
</div>

<style>
  .app {
    --height-nav: 7rem;
    --height-footer: 15rem;
    width: 100%;
    height: 100%;
    position: relative;
    padding-top: var(--height-nav);
  }

  main {
    min-height: calc(100% - var(--height-footer));
    width: 100%;
    overflow: hidden;
  }

  @media screen and (max-width: 700px) {
    .app {
      padding-top: 0;
    }

    main {
      min-height: calc(100% - var(--height-nav));
      padding-bottom: calc(var(--height-nav) + 2rem);
    }
  }
</style>
