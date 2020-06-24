<script>
  import { _, locale } from 'svelte-i18n';
  import CollapsibleGroup from '../../components/CollapsibleGroup.svelte';
  import { getArrayFromLocale } from '@/util';

  $: rules = getArrayFromLocale('rules.rules', $locale);
</script>

<svelte:head>
  <title>Rules | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('rules.title')}</h2>
  <p>{$_('rules.description')}</p>
</div>
<CollapsibleGroup collapsibles={rules} />
