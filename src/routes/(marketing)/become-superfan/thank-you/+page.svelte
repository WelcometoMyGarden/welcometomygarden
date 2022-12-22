<script>
  import { _ } from 'svelte-i18n';
  import Button from '@/lib/components/UI/Button.svelte';
  import routes from '@/lib/routes';
  import MarketingBlock from '../../_components/MarketingBlock.svelte';
  import PaddedSection from '../../_components/PaddedSection.svelte';
  import Features from '../../_sections/Features.svelte';
</script>

<PaddedSection>
  <MarketingBlock backgroundColor="var(--color-green-light)" centered>
    <h1>{$_('thank-you-superfan.top-section.title')}</h1>
    {@html $_('thank-you-superfan.top-section.description')}
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <h2>{$_('thank-you-superfan.features-section.title')}</h2>
  <Features />
  <Button href={routes.MAP} uppercase orange arrow
    >{$_('thank-you-superfan.features-section.explore-features-button')}</Button
  >
</PaddedSection>
<PaddedSection>
  <MarketingBlock backgroundColor="var(--color-beige-light)" centered>
    {@html $_('thank-you-superfan.closing-section.text')}
  </MarketingBlock>
</PaddedSection>
