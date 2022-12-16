<script lang="ts">
  import ContributeBlock from './ContributeBlock.svelte';
  import Text from '$lib/components/UI/Text.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';

  const blocks = [
    {
      title: 'Become a superfan',
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

  div :global(.block:nth-child(odd)) {
    align-self: flex-start;
  }
  div :global(.block:not(:first-child)) {
    margin-top: 2rem;
  }
</style>
