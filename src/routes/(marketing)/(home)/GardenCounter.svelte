<script>
  import { getGardenCount } from '$lib/api/stats';
</script>

<span>
  {#await getGardenCount()}
    {'...'}
  {:then count}
    {count ?? '257'}
  {/await}
</span>
