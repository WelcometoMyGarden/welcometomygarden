<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroupFromKey from '../../components/CollapsibleGroupFromKey.svelte';
</script>

<svelte:head>
  <title>{$_('generics.faq.acronym')} | Welcome To My Garden</title>
</svelte:head>

<div class="intro">
  <h2>{$_('faq.title')}</h2>
  <p>{$_('faq.description')}</p>
</div>
<CollapsibleGroupFromKey i18nKey="faq.questions" />
