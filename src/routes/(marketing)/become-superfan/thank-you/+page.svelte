<script>
  import Button from '@/lib/components/UI/Button.svelte';
  import routes from '@/lib/routes';
  import MarketingBlock from '../../_components/MarketingBlock.svelte';
  import PaddedSection from '../../_components/PaddedSection.svelte';
  import Features from '../../_sections/Features.svelte';
</script>

<PaddedSection>
  <MarketingBlock backgroundColor="var(--color-green-light)" centered>
    <h1>Thank you for becoming a Superfan 🌟</h1>
    <p>
      You are our hero! By becoming a Superfan, you are helping us to accomplish our mission: to
      make slow travel more accessible for everyone, encourage sustainable travel and foster
      precious new connections between people.
    </p>
    A huge thank you on behalf of the entire team!
    <p />
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <h2>You now have access to new features</h2>
  <Features />
  <Button href={routes.MAP}>Explore new features</Button>
</PaddedSection>
<PaddedSection>
  <MarketingBlock backgroundColor="var(--color-beige-light)" centered>
    <p>Thank you again for becoming a Superfan!</p>
    <p>
      <strong>The WTMG team,</strong><br />
      Dries, Manon, Thor, Ward & Janneke
    </p>
    A huge thank you on behalf of the entire team!
    <p />
  </MarketingBlock>
</PaddedSection>
