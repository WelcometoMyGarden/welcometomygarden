<script>
  import { _ } from 'svelte-i18n';
  import CollapsibleGroup from '../components/CollapsibleGroup.svelte';
  import { getArrayFromLocale } from '@/util';
</script>

<div class="content">
  <h2>{$_('faq.title')}</h2>
  <div class="title-line-break" />
  <p>{$_('faq.description')}</p>
  <CollapsibleGroup collapsibles={getArrayFromLocale('faq.questions')} />
</div>

<style>

</style>
