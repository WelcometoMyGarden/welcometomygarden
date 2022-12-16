<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '@/lib/stores/auth';
  import { goto } from '$app/navigation';
  import enterHandler from '@/lib/util/keyhandlers';
  import SuperfanLevel from '@/routes/(marketing)/_components/SuperfanLevel.svelte';
  import routes from '@/lib/routes';
  import MarketingBlock from '@/routes/(marketing)/_components/MarketingBlock.svelte';
  import Features from '../_sections/Features.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Heading from '../_components/Heading.svelte';
  import SupportReasons from '../_sections/SupportReasons.svelte';
  import { superfanLevels, type SuperfanLevelData } from '../_static/superfan-levels';

  const selectLevel = (level: SuperfanLevelData) => {
    if (!user) {
      return goto(routes.SIGN_IN);
    }

    return goto(`${routes.SUPERFAN_PAYMENT}/${level.id}`);
  };

  const handleKeyPress = (event: CustomEvent<KeyboardEvent>, item: SuperfanLevelData) => {
    const handler = enterHandler(() => selectLevel(item));
    handler(event.detail);
  };
</script>

<svelte:head>
  <title>{$_('account.title')} | Welcome To My Garden</title>
</svelte:head>

<PaddedSection desktopOnly>
  <MarketingBlock backgroundColor="var(--color-green-light)" centered>
    <h1>Support WTMG: become a Superfan!</h1>
    <p>
      Welcome To My Garden is on a mission to make slow travel more accessible for everyone. Your
      financial contribution will make it possible for Welcome To My Garden to remain free for
      everyone to use. As a Superfan, you also get access to new features!
    </p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <h1>What's in it for you?</h1>
  <Features />
</PaddedSection>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <Heading caption="Open pricing">
    Choose the price that fits you best
    <p>
      We use open pricing because we want WTMG to be available to everyone, and we trust your
      decision. You pay for one year at a time. Becoming a Superfan is commitment-free: your
      subscription stops automatically after one year, and you will receive an email to renew it.
    </p>
  </Heading>
  <div class="superfan-levels">
    {#each superfanLevels as item}
      <SuperfanLevel
        {item}
        on:click={() => selectLevel(item)}
        on:keypress={(e) => handleKeyPress(e, item)}
      />
    {/each}
  </div>
</PaddedSection>
<PaddedSection>
  <h1>Thanks to your support, we can...</h1>
  <SupportReasons />
</PaddedSection>

<style>
  .superfan-levels {
    display: flex;
    justify-content: center;
    gap: 2rem;
    width: 100%;
  }
</style>
