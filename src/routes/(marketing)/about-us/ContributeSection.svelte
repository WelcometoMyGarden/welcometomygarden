<script lang="ts">
  import ContributeBlock from './ContributeBlock.svelte';
  import Text from '$lib/components/UI/Text.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Icon from '@/lib/components/UI/Icon.svelte';
  import contributeIllustration from '$lib/images/contribute.svg';
  import Heading from '../_components/Heading.svelte';
  import { _ } from 'svelte-i18n';
  import { getNodeChildren } from '@/lib/util';
</script>

<PaddedSection>
  <div class="header">
    <Icon icon={contributeIllustration} />
    <Heading caption={$_('about-us.for-everyone')}>{$_('about-us.how-contribute')}</Heading>
    <p>{$_('about-us.ways-support')}</p>
  </div>
  <div class="how-to-contribute">
    {#each getNodeChildren('about-us.contribute-blocks') as number}
      <ContributeBlock title={$_(`about-us.contribute-blocks.${number}.title`)} {number}>
        <Text>{$_(`about-us.contribute-blocks.${number}.text`)}</Text>
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
