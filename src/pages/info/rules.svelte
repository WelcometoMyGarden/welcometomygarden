<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroup from '../../components/CollapsibleGroup.svelte';
</script>

<svelte:head>
  <title>{$_('generics.rules')} | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('rules.title')}</h2>
  <p>{$_('rules.description')}</p>
</div>
<CollapsibleGroup collapsibleKey={'rules.rules'} />
