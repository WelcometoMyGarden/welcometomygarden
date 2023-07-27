<script>
  import { getSuperfanCount } from '$lib/api/stats';
  import { _ } from 'svelte-i18n';
</script>

<span>
  {#await getSuperfanCount()}
    {'...'}
  {:then count}
    {typeof count === 'number' ? count.toLocaleString('nl-BE') : '1.312'}
  {/await}
</span>
