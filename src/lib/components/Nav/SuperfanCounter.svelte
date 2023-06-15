<script>
  import { getSuperfanCount } from '$lib/api/stats';
  import { _ } from 'svelte-i18n';
</script>

<span>
  {#await getSuperfanCount()}
    {'...'}
  {:then count}
    {count ?? '257'}
  {/await}
  {$_('generics.member').toLocaleLowerCase()}s
</span>
