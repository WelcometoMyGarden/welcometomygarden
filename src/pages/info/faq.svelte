<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroup from '../../components/CollapsibleGroup.svelte';
</script>

<svelte:head>
  <title>{$_('generics.faq.acronym')} | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('faq.title')}</h2>
  <p>{$_('faq.description')}</p>
</div>
<CollapsibleGroup collapsibleKey="faq.questions" />
