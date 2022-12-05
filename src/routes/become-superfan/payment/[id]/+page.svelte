<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '@/lib/stores/auth';
  import type { PageData } from './$types';
  import { superfanLevels, type SuperfanLevelData } from '../../+page.svelte';
  import SuperfanLevel from '@/lib/components/UI/SuperfanLevel.svelte';

  export let data: PageData;

  let selectedLevel: SuperfanLevelData | undefined = data.params.id ? superfanLevels.find(level => level.id === data.params.id) : undefined;

</script>

<svelte:head>
  <title>{$_('account.title')} | Welcome To My Garden</title>
</svelte:head>

<!-- TODO: find a way to generalize the wrapper across pages -->
<div
  class="wrapper"
>
  {#if $user && selectedLevel}
    <SuperfanLevel item={selectedLevel} />
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
</style>
