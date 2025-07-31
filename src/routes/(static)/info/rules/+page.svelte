<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
</script>

<svelte:head>
  <title>{$_('generics.rules')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<div class="intro">
  <h2>{$_('rules.title')}</h2>
  <p>{@html $_('rules.description')}</p>
</div>

<CollapsibleGroup collapsibleKey={'rules.rules'} />
