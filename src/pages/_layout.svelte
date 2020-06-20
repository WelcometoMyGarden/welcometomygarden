<script>
  import { onMount, onDestroy } from 'svelte';
  import { isLoading as isLocaleLoading } from 'svelte-i18n';
  import { createAuthObserver } from '@/api/auth';
  import { createChatObserver } from '@/api/chat';
  import { user, isInitializing } from '@/stores/auth';
  import { Progress, Notifications } from '@/components/UI';
  import Nav from '../components/Nav/Navigation.svelte';
  import Footer from '@/components/Footer.svelte';

  onMount(() => {
    return createAuthObserver();
  });

  let unsubscribeFromChatObserver;
  $: if ($user) unsubscribeFromChatObserver = createChatObserver();

  onDestroy(() => {
    if (unsubscribeFromChatObserver) unsubscribeFromChatObserver();
  });
</script>

<div class="app">
  <Progress active={$isInitializing || $isLocaleLoading} />
  <Notifications />

  {#if !$isInitializing && !$isLocaleLoading}
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
    max-width: 155rem;
    margin: 0 auto;
  }

  @media screen and (max-width: 700px) {
    .app {
      padding-top: 0;
    }

    main {
      min-height: calc(100% - var(--height-nav));
      padding-bottom: calc(var(--height-nav));
    }
  }
</style>
