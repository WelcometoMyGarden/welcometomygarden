<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { user } from '@/lib/stores/auth';
  import { goto } from '$app/navigation';
  import enterHandler from '@/lib/util/keyhandlers';
  import routes from '@/lib/routes';
  import MarketingBlock from '@/routes/(marketing)/_components/MarketingBlock.svelte';
  import Features from '../_sections/Features.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Heading from '../_components/Heading.svelte';
  import SupportReasons from '../_sections/SupportReasons.svelte';
  import { superfanLevels, type SuperfanLevelData } from '../_static/superfan-levels';
  import { onMount } from 'svelte';
  import smoothscroll from 'smoothscroll-polyfill';
  import SuperfanLevel from '../_components/SuperfanLevel.svelte';
  import Button from '@/lib/components/UI/Button.svelte';
  import { getSubLevelBySlug } from './subscription-utils';

  // Default: normal / plant
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let selectedLevel = superfanLevels.find((l) => l.slug === 'plant')!;

  const selectLevel = (level: SuperfanLevelData) => {
    selectedLevel = level;
  };

  // TODO: the selectedLevels should be a keyed object, not an array.
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

  // TODO: the selectedLevels should be a keyed object, not an array.
  // Array is more difficult to type.
  $: sliderPosition = sliderPositions[selectedLevel.slug as keyof typeof sliderPositions];

  const goToPaymentPage = async (level: SuperfanLevelData) => {
    if (!user) {
      return await goto(routes.SIGN_IN);
    }
    return await goto(`${routes.SUPERFAN_PAYMENT}/${level.slug}`);
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
  <title>{$_('account.title')} | Welcome To My Garden</title>
</svelte:head>

<svelte:window bind:innerWidth />

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

<PaddedSection backgroundColor="var(--color-beige-light)" vertical id="pricing">
  <Heading caption="Open pricing">
    Choose the price that fits you best
    <p>
      We use open pricing because we want WTMG to be available to everyone, and we trust your
      decision. You pay for one year at a time. Becoming a Superfan is commitment-free: your
      subscription stops automatically after one year, and you will receive an email to renew it.
    </p>
  </Heading>
  <div class="superfan-levels-container">
    <div class="superfan-levels">
      {#each superfanLevels as level}
        <SuperfanLevel
          {level}
          on:click={() => selectLevel(level)}
          on:keypress={(e) => handleKeyPress(e, level)}
          selected={level.slug === selectedLevel.slug}
        />
      {/each}
    </div>
    <div class="slider-bar">
      <!-- 1.5 rem: half of the slider knob -->
      <div
        class="slider-bar-filled"
        style:width={!isMobile ? `calc(${sliderPosition}% + 1.5rem)` : null}
        style:height={isMobile ? `calc(${sliderPosition}% + 1.5rem)` : null}
      />
      {#each Object.entries(sliderPositions) as [slug, position]}
        {#if slug}
          <button
            class="slider-position"
            style:left={!isMobile ? `${position}%` : null}
            style:top={isMobile ? `${position}%` : null}
            style:border-color={borderColorOfSlug(slug)}
            on:click={() => selectLevelBySlug(slug)}
          />
        {/if}
      {/each}
      <div
        class="slider"
        style:left={!isMobile ? `${sliderPosition}%` : null}
        style:top={isMobile ? `${sliderPosition}%` : null}
      />
    </div>
  </div>
  <div class="select-level-button">
    <Button uppercase orange arrow on:click={() => goToPaymentPage(selectedLevel)}
      >Become a Superfan</Button
    >
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

  .select-level-button {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .slider-bar,
  .slider-bar-filled {
    height: 1rem;
    border-radius: 0.5rem;
  }
  .slider-bar {
    margin: 3rem 0;
    width: 100%;
    background-color: var(--color-green-light);
    position: relative;
  }

  .slider-bar-filled {
    background-color: var(--color-green);
    position: absolute;
    left: 0;
    transition: height 0.3s, width 0.3s;
  }

  .slider,
  .slider-position {
    width: 3rem;
    height: 3rem;
    position: absolute;
    border-radius: 50%;
    top: -100%;
    transition: border-color 0.15s;
  }

  .slider {
    transition: left 0.3s, top 0.3s;
    background-color: var(--color-green);
  }

  .slider-position {
    border: 2px solid var(--color-green-light);
    background-color: white;
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

    .slider-bar,
    .slider-bar-filled {
      width: 1rem;
    }

    .slider-bar {
      /* 1.5rem: full knob away */
      margin: 0 0 0 1.5rem;
      grid-column: 1;
      grid-row: 1;
      height: 100%;
    }

    .slider,
    .slider-position {
      position: absolute;
      border-radius: 50%;
      left: -100%;
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
