<script>
  import { getGardenCount } from '$lib/api/stats';
</script>

<span>
  {#await getGardenCount()}
    {'...'}
  {:then count}
    {count ?? '7000'}
  {/await}
</span>
