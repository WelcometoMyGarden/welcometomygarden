<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import enterHandler from '$lib/util/keyhandlers';
  import routes from '$lib/routes';
  import MarketingBlock from '$routes/(marketing)/_components/MarketingBlock.svelte';
  import Features from '../../_sections/Features.svelte';
  import PaddedSection from '../../_components/PaddedSection.svelte';
  import Heading from '../../_components/Heading.svelte';
  import SupportReasons from '../../_sections/SupportReasons.svelte';
  import {
    superfanLevels,
    type SuperfanLevelData,
    DEFAULT_MEMBER_LEVEL
  } from '../../_static/superfan-levels';
  import { onMount, onDestroy } from 'svelte';
  import smoothscroll from 'smoothscroll-polyfill';
  import SuperfanLevel from '../../_components/SuperfanLevel.svelte';
  import Button from '$lib/components/UI/Button.svelte';
  import { getSubLevelBySlug } from '../subscription-utils';

  // Default: reduced price
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let selectedLevel = superfanLevels.find((l) => l.slug === DEFAULT_MEMBER_LEVEL)!;

  const selectLevel = (level: SuperfanLevelData) => {
    selectedLevel = level;
  };

  /**
   * Inserts localized copy.
   */
  const mapToSuperfanLevelProps = (level: SuperfanLevelData) => {
    // remove copyKey & stripePriceId, of which the SuperfanLevel component needs no knowledge.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { copyKey, stripePriceId, ...rest } = level;

    return {
      ...rest,
      slugCopy: $_(`become-superfan.pricing-section.pricing-levels.${level.copyKey}.slug`),
      title: $_(`become-superfan.pricing-section.pricing-levels.${level.copyKey}.title`),
      description: $_(`become-superfan.pricing-section.pricing-levels.${level.copyKey}.description`)
    };
  };

  let superfanLevelData: SuperfanLevelData[] = superfanLevels;

  // Listen to localization to trigger reactivity on superfanLevelData.
  const unsubscribeFromLocalization = _.subscribe(() => {
    superfanLevelData = superfanLevels;
  });

  onDestroy(() => {
    unsubscribeFromLocalization();
  });

  // Array is more difficult to type.
  const selectLevelBySlug = (level: string) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    selectedLevel = getSubLevelBySlug(level)!;
  };

  // In percentages
  const sliderPositions = {
    sow: 15,
    plant: 50,
    grow: 83
  };

  $: borderColorOfSlug = (slug: string) => {
    const slugs = Object.keys(sliderPositions);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const selectedPosition = slugs.indexOf(selectedLevel.slug)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const argPosition = slugs.indexOf(slug)!;
    return selectedPosition > argPosition ? 'var(--color-green)' : 'var(--color-green-light)';
  };

  const goToPaymentPage = async (level: SuperfanLevelData) => {
    if (!user) {
      return await goto(routes.SIGN_IN);
    }
    return await goto(`${routes.MEMBER_PAYMENT}/${level.slug}`);
  };

  const handleKeyPress = (event: CustomEvent<KeyboardEvent>, item: SuperfanLevelData) => {
    const handler = enterHandler(() => selectLevel(item));
    handler(event.detail);
  };

  onMount(() => {
    // Allow to skip to the pricing section
    smoothscroll.polyfill();
    if (window.location.hash.endsWith('pricing')) {
      const pricingElem = document.getElementById('pricing');
      window.scroll({ top: pricingElem?.offsetTop });
    }
  });

  // TODO: extract slider into component
  let innerWidth: number;
  // TODO: refactor to a `use` svelte expression?
  $: isMobile = innerWidth <= 850;
</script>

<svelte:head>
  <title>{$_('account.title')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<svelte:window bind:innerWidth />

<PaddedSection desktopOnly>
  <MarketingBlock backgroundColor="var(--color-green-light)" centered>
    <h1>{$_('become-superfan.top-section.title')}</h1>
    <p>{$_('become-superfan.top-section.description')}</p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <h2>{$_('become-superfan.feature-section.title')}</h2>
  <Features />
</PaddedSection>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical id="pricing">
  <Heading caption={$_('become-superfan.pricing-section.slug')} centered>
    {$_('become-superfan.pricing-section.title')}
  </Heading>
  <p class="pricing-description">{$_('become-superfan.pricing-section.description')}</p>
  <div class="superfan-levels-container">
    <div class="superfan-levels">
      {#each superfanLevelData as level}
        <SuperfanLevel
          {...mapToSuperfanLevelProps(level)}
          on:click={() => selectLevel(level)}
          on:keypress={(e) => handleKeyPress(e, level)}
          selected={level.slug === selectedLevel.slug}
        />
      {/each}
    </div>
  </div>
  <div class="select-level-button">
    <Button uppercase orange arrow on:click={() => goToPaymentPage(selectedLevel)}
      >{$_('generics.become-superfan')}</Button
    >
  </div>
</PaddedSection>
<PaddedSection>
  <h2>{$_('superfan-shared.three-support-reasons.title')}</h2>
  <SupportReasons />
</PaddedSection>

<style>
  .superfan-levels {
    display: flex;
    justify-content: center;
    gap: 2rem;
    width: 100%;
  }

  .pricing-description {
    max-width: 82rem;
    text-align: center;
    margin: 0 auto var(--section-inner-padding) auto;
  }

  .select-level-button {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .superfan-levels-container {
    display: grid;
    grid-template-rows: auto auto;
    grid-template-columns: auto;
  }

  @media screen and (max-width: 850px) {
    .superfan-levels-container {
      grid-template-columns: min-content auto;
      grid-template-rows: auto;
      gap: max(2rem, 7vw);
    }

    .superfan-levels {
      grid-column: 2;
    }
  }

  @media screen and (max-width: 850px) {
    .superfan-levels {
      flex-direction: column;
    }
  }
</style>
