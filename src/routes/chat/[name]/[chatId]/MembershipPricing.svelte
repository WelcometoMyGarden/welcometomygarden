<script lang="ts">
  import { _ } from 'svelte-i18n';
  import {
    superfanLevels,
    type SuperfanLevelData
  } from '$routes/(marketing)/_static/superfan-levels';
  import enterHandler from '$lib/util/keyhandlers';
  import { Button } from '$lib/components/UI';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import routes from '$lib/routes';
  import MembershipLevel from './MembershipLevel.svelte';
  import { WTMG_BLOG_BASE_URL } from '$lib/constants';
  import { Anchor } from '$lib/components/UI';

  /**
   * Whether this shows a condensed pricing levels on desktop
   */
  export let condensed = false;

  //   TODO: copied from become-superfan, refactor

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

  // Default: normal / plant
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let selectedLevel = superfanLevels.find((l) => l.slug === 'plant')!;

  const selectLevel = (level: SuperfanLevelData) => {
    selectedLevel = level;
  };

  const handleKeyPress = (event: CustomEvent<KeyboardEvent>, item: SuperfanLevelData) => {
    const handler = enterHandler(() => selectLevel(item));
    handler(event.detail);
  };

  // TODO: extract slider into component
  let innerWidth: number;

  const goToPaymentPage = async (level: SuperfanLevelData) => {
    if (!$user) {
      return await goto(routes.SIGN_IN);
    }
    return await goto(`${routes.SUPERFAN_PAYMENT}/${level.slug}`);
  };
</script>

<!-- <p class="pricing-description">{$_('become-superfan.pricing-section.description')}</p> -->
<div class="container">
  <div class="pricing-description">
    <h3 id="pricing-title">Pick a membership level</h3>
    <p id="pricing-description">Valid for one year. Not automatically recurring.</p>
  </div>
  <div
    class="membership-levels"
    class:condensed
    role="radiogroup"
    aria-labelledby="pricing-title"
    aria-describedby="pricing-description"
  >
    {#each superfanLevels as level}
      <MembershipLevel
        {...mapToSuperfanLevelProps(level)}
        selected={level.slug === selectedLevel.slug}
        embeddable={condensed}
        on:click={() => selectLevel(level)}
        on:keypress={(e) => handleKeyPress(e, level)}
      />
    {/each}
  </div>
  <div class="select-level-button">
    <!-- TODO: translate -->
    <!-- {$_('generics.become-superfan')} -->
    <Button uppercase orange arrow on:click={() => goToPaymentPage(selectedLevel)}>
      Become a
      {#if selectedLevel.slug === 'sow'}
        member
      {:else}
        Superfan
      {/if}
    </Button>
  </div>
  <p class="fineprint">
    <!-- TODO: fix link -->
    Questions? <Anchor href="{routes.ABOUT_SUPERFAN} newtab">See the FAQ.</Anchor> Blog post:
    <Anchor href="{WTMG_BLOG_BASE_URL}{$_('generics.fair-model-blog-path')}" newtab
      >Why a membership for WTMG?</Anchor
    > By becoming a Member, you agree with <Anchor href={routes.RULES}>our rules.</Anchor>
  </p>
</div>

<svelte:window bind:innerWidth />

<style>
  .membership-levels {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2rem;
    width: 100%;
  }

  .container {
    height: fit-content;
  }

  /* Condensed desktop modal styles & overrides */
  .membership-levels.condensed {
    border: 1px solid var(--color-green);
    border-radius: var(--tile-border-radius);
  }
  .membership-levels.condensed :global(.membership-level) {
    position: relative;
  }
  .membership-levels.condensed :global(.membership-level:first-child)::after {
    content: '';
    position: absolute;
    top: 100%;
    width: 100%;
    height: 1px;
    background-color: var(--color-green);
  }

  h3 {
    font-size: 2rem;
    font-weight: 600;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .pricing-description {
    max-width: 82rem;
    text-align: center;
    margin: 0rem auto 2rem auto;
  }

  .select-level-button {
    margin: 2rem 0;
    display: flex;
    justify-content: center;
    width: 100%;
  }

  p.fineprint {
    text-align: center;
    font-size: 1.4rem;
  }
</style>
