<script lang="ts">
  import { _, t } from 'svelte-i18n';
  import {
    superfanLevels,
    type SuperfanLevelData,
    DEFAULT_MEMBER_LEVEL,
    SuperfanLevelSlug
  } from '$routes/(marketing)/_static/superfan-levels';
  import enterHandler from '$lib/util/keyhandlers';
  import { Button, LabeledCheckbox } from '$lib/components/UI';
  import { user } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import routes from '$lib/routes';
  import MembershipLevel from './MembershipLevel.svelte';
  import { WTMG_BLOG_BASE_URL } from '$lib/constants';
  import { Anchor } from '$lib/components/UI';
  import { page } from '$app/stores';
  import { anchorText } from '$lib/util/translation-helpers';

  /**
   * Whether this shows a condensed pricing levels on desktop
   */
  export let condensed = false;

  let acceptedTerms = false;

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
  let selectedLevel = superfanLevels.find((l) => l.slug === DEFAULT_MEMBER_LEVEL)!;

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
    let continueUrl = '';
    // If the person was trying to open a chat, include it as a continueUrl
    if (
      $page.url.pathname.startsWith(routes.CHAT) &&
      $page.url.pathname.includes('new') &&
      $page.url.searchParams.get('id')
    ) {
      // Use a "with" link, because that one is used to trigger fetching partner details in an onMount
      // TODO: simplify this...
      continueUrl = `${routes.CHAT}?with=${$page.url.searchParams.get('id')}`;
    }
    return await goto(
      `${routes.MEMBER_PAYMENT}/${level.slug}${
        continueUrl ? `?continueUrl=${encodeURIComponent(continueUrl)}` : ''
      }`
    );
  };
</script>

<div class="container">
  <div class="pricing-description">
    <h3 id="pricing-title">{$t('become-superfan.pricing-section.title')}</h3>
    <p id="pricing-description">{$t('become-superfan.pricing-section.description')}</p>
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
  <LabeledCheckbox name="accept-terms" bind:checked={acceptedTerms}
    >{@html $_('become-superfan.pricing-section.terms-label', {
      values: {
        termsLink: anchorText({
          href: routes.RULES,
          linkText: $_('become-superfan.pricing-section.terms-link-text'),
          class: 'link'
        })
      }
    })}</LabeledCheckbox
  >
  <div class="select-level-button">
    <!-- TODO: translate -->
    <!-- {$_('generics.become-superfan')} -->
    <Button
      uppercase
      orange
      disabled={!acceptedTerms}
      arrow
      on:click={() => goToPaymentPage(selectedLevel)}
    >
      {#if selectedLevel.slug === SuperfanLevelSlug.REDUCED}
        {$_('generics.become-member')}
      {:else}
        {$_('generics.become-superfan')}
      {/if}
    </Button>
  </div>
  <p class="fineprint">
    <!-- TODO: fix FAQ link, immediately jump to FAQ -->
    {$t('become-superfan.pricing-section.questions')}{' '}<Anchor
      href={routes.ABOUT_MEMBERSHIP}
      newtab>{$t('become-superfan.pricing-section.faq-link-text')}</Anchor
    >
    {$t('become-superfan.pricing-section.blog-post')}
    <Anchor
      href="{WTMG_BLOG_BASE_URL}{$_(
        'generics.fair-model-blog-path'
      )}?utm_source=welcometomygarden.org&utm_medium=web&utm_campaign=membership&utm_content=pricing_modal"
      newtab>{$t('become-superfan.pricing-section.blog-post-link-text')}</Anchor
    >
  </p>
</div>

<svelte:window bind:innerWidth />

<style>
  .membership-levels {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 1.5rem;
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

  .container :global(label[for='accept-terms']) {
    line-height: 1.4;
  }
  .container :global(input[name='accept-terms']) {
    width: 3.5rem;
    height: 3.5rem;
    margin-right: 1.3rem;
  }

  p.fineprint {
    text-align: center;
    font-size: 1.4rem;
  }
</style>
