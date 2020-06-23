<script>
  import { _, locale } from 'svelte-i18n';
  import CollapsibleGroup from '../../components/CollapsibleGroup.svelte';
  import { getArrayFromLocale } from '@/util';

  $: faqQuestions = getArrayFromLocale('faq.questions', $locale);
</script>

<div class="intro">
  <h2>{$_('faq.title')}</h2>
  <p>{$_('faq.description')}</p>
</div>
<CollapsibleGroup collapsibles={faqQuestions} />
