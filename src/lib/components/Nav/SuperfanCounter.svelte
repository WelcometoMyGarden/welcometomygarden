<script>
  import { getSuperfanCount } from '$lib/api/stats';
  import routes from '$lib/routes';
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';

  let superfanCount;
  onMount(async () => {
    superfanCount = await getSuperfanCount();
  });
</script>

<span>
  <a class="link" style="color:inherit" href={routes.BECOME_SUPERFAN}>
    {$_('navigation.slowby-notice.link-text')}{' '}
    {#await getSuperfanCount()}
      {'...'}
    {:then count}
      {count ?? '207'}
    {/await} Superfans
  </a>
  {$_('navigation.slowby-notice.answer')}
</span>
