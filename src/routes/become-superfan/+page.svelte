<script context="module" lang="ts">
  export type SuperfanLevelData = {
    title: string,
    id: string,
    value: number,
    stripePriceId: string
  }
  export const superfanLevels: SuperfanLevelData[] = [
    {
      title: 'Reduced price',
      id: 'reduced',
      value: 3,
      stripePriceId: 'a'
    },
    {
      title: 'Normal price',
      id: 'normal',
      value: 5,
      stripePriceId: 'b'
    },
    {
      title: 'Solidarity price',
      id: 'solidarity',
      value: 7,
      stripePriceId: 'c'
    }
  ];
</script>
<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '@/lib/stores/auth';
  import { goto } from '$app/navigation';
  import enterHandler from '@/lib/util/keyhandlers';
  import SuperfanLevel from '@/lib/components/UI/SuperfanLevel.svelte';

  function selectLevel(level: SuperfanLevelData) {
    // TODO replace with constant
    goto(`/become-superfan/payment/${level.id}`)
  }

  function handleKeyPress(event: CustomEvent<KeyboardEvent>, item: SuperfanLevelData) {
    const handler = enterHandler(() => selectLevel(item));
    handler(event.detail);
  }
</script>

<svelte:head>
  <title>{$_('account.title')} | Welcome To My Garden</title>
</svelte:head>

<!-- TODO: find a way to generalize the wrapper across pages -->
<div class="wrapper">
  {#if $user}
    <div>
      <div class="superfan-levels">
        {#each superfanLevels as item}
          <SuperfanLevel item={item} on:click={() => selectLevel(item)} on:keypress={(e) => handleKeyPress(e, item)}></SuperfanLevel>
        {/each}
      </div>
    </div>
  {:else}
    No user!
    <!-- else content here -->
  {/if}
</div>

<style>
  .wrapper {
    max-width: 900px;
    width: 100%;
    min-height: calc(calc(var(--vh, 1vh) * 100) - var(--height-footer) - var(--height-nav) - 14rem);
    margin: 10rem auto 4rem auto;
  }

  .superfan-levels {
    display: flex;
    justify-content: center;
    gap: 2rem;
    width: 100%;
  }


</style>
