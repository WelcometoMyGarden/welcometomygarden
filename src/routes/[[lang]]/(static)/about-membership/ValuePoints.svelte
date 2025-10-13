<script>
  import { valuePoints } from '$lib/components/Membership/membership-points';
  import ValuePoint from '$lib/components/Membership/ValuePoint.svelte';
  import { locale } from 'svelte-i18n';
  $: valuePointsLocal = valuePoints($locale ?? 'en');
</script>

<ul class="value-points">
  {#each valuePointsLocal as item}
    <ValuePoint {...item} border />
  {/each}
</ul>

<style>
  ul {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
  }

  @media screen and (max-width: 850px) {
    ul {
      gap: 2.5rem;
    }
  }

  @media screen and (max-width: 700px) {
    ul {
      grid-template-columns: auto;
    }
  }
</style>
