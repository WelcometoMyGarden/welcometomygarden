<script>
  import { _ } from 'svelte-i18n';
  import PaddedSection from '../../_components/PaddedSection.svelte';
  import MarketingBlock from '../../_components/MarketingBlock.svelte';
</script>

<PaddedSection>
  <MarketingBlock backgroundColor="var(--color-beige-light)" centered>
    <h1>{$_('thank-you-donate.top-section.title')}</h1>
    {@html $_('thank-you-donate.top-section.description')}
  </MarketingBlock>
</PaddedSection>
