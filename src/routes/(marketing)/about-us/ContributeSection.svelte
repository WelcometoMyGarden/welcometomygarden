<script lang="ts">
  import ContributeBlock from './ContributeBlock.svelte';
  import Text from '$lib/components/UI/Text.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Icon from '@/lib/components/UI/Icon.svelte';
  import contributeIllustration from '$lib/images/contribute.svg';
  import Heading from '../_components/Heading.svelte';

  const blocks = [
    {
      title: 'Become a Superfan',
      text: 'Become a Superfan and get access to extra features! Superfans are very important to WTMG as they keep it free for everyone to use.'
    },
    {
      title: 'Go on a secret trip',
      text: 'With Slowby, WTMG’s little sister, you can go on a secret slow travel trip! We take care of the planning. All you need to do is pack and pedal, or walk! You can also get a gift card for someone you love!'
    },
    {
      title: 'Spread the word',
      text: 'Tell other slow travel lovers and garden owners about WTMG, and share WTMG on social media. More slow travellers means a bigger impact on our beautiful world!'
    }
  ].map((b, index) => ({ ...b, number: '' + (index + 1) }));
</script>

<PaddedSection>
  <div class="header">
    <Icon icon={contributeIllustration} />
    <Heading caption="WTMG For Everyone">How can you contribute?</Heading>
    <p>Here are all the ways in which you can support us.</p>
  </div>
  <div class="how-to-contribute">
    {#each blocks as block}
      <ContributeBlock {...block}>
        <Text>{block.text}</Text>
      </ContributeBlock>
    {/each}
  </div>
</PaddedSection>

<style>
  div.how-to-contribute {
    max-width: 90rem;
    margin: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  .header {
    text-align: center;
  }

  .header :global(svg) {
    display: flex;
    justify-content: center;
    width: 100%;
    max-width: 16rem;
    margin-bottom: 2rem;
  }

  /* Centers the heading */
  .header :global(div h2) {
    /* text-align: center; */
    margin-bottom: 1.5rem;
  }

  .header > p {
    margin-bottom: var(--section-inner-padding);
  }

  @media screen and (max-width: 700px) {
    .header :global(svg) {
      max-width: 13rem;
    }
  }

  div :global(.block:nth-child(odd)) {
    align-self: flex-start;
  }
  div :global(.block:not(:first-child)) {
    margin-top: 2rem;
  }
</style>
