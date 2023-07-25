<script lang="ts">
  import { _, t, json } from 'svelte-i18n';
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
  import { Anchor } from '$lib/components/UI';
  import { page } from '$app/stores';
  import { anchorText, membershipBlogLink } from '$lib/util/translation-helpers';
  import SliderRadio from './SliderRadio.svelte';
  import { mapValues } from 'lodash-es';
  import { toArray, type LocaleDictionary } from '$lib/util/get-node-children';
  import {
    PlausibleEvent,
    type PlausiblePricingSectionSourceProperties
  } from '$lib/types/Plausible';
  import trackEvent from '$lib/util/track-plausible';
  import createUrl from '$lib/util/create-url';

  /**
   * Whether to show full cards with all info.
   */
  export let full = false;

  /**
   * Whether this shows a condensed pricing levels on desktop
   */
  export let condensed = false;

  /**
   * Source used in Plausible analytics
   */
  export let analyticsSource: PlausiblePricingSectionSourceProperties['source'];

  let acceptedTerms = false;

  // Only allow continuing if the terms are accepted, display an error otherswise
  let continueError: string | null = null;

  //   TODO: copied from become-superfan, refactor

  /**
   * Inserts localized copy.
   */
  const addPricingLevelCopy = (level: SuperfanLevelData) => {
    // remove copyKey & stripePriceId, of which the SuperfanLevel component needs no knowledge.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { copyKey, stripePriceId, ...rest } = level;
    const prefix = `become-superfan.pricing-section.pricing-levels.${level.copyKey}.`;

    const checkList = toArray($json(`${prefix}checklist`) as LocaleDictionary | undefined) ?? [];
    return {
      ...rest,
      // Pull in localized string properties
      ...mapValues(
        {
          title: 'title',
          description: 'description',
          mobileSuperfanCopy: 'mobile-superfan-copy',
          backref: 'backref'
        },
        (v) => $_(prefix + v, { default: '' })
      ),
      // Add the array property
      checkList
    };
  };

  // Default: normal / plant
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let selectedLevel = superfanLevels.find((l) => l.slug === DEFAULT_MEMBER_LEVEL)!;

  // 0-indexed
  // In case of full (= 3 options, incl free), member is 1. In case of non-full (2 options), it is 0
  let selectedRadioOption = full ? 1 : 0;

  $: selectedLevel = visibleLevels[selectedRadioOption] ?? selectedLevel;

  const selectLevel = (level: SuperfanLevelData) => {
    selectedLevel = level;
    selectedRadioOption = visibleLevels.findIndex((l) => l.slug === selectedLevel.slug);
  };

  let visibleLevels = superfanLevels;
  $: if (full) {
    visibleLevels = [freeLevelProps, ...superfanLevels];
  }

  const handleKeyPress = (event: CustomEvent<KeyboardEvent>, item: SuperfanLevelData) => {
    const handler = enterHandler(() => selectLevel(item));
    handler(event.detail);
  };

  // TODO: extract slider into component
  let innerWidth: number;

  $: isMobile = innerWidth <= 850;

  const freeLevelProps: SuperfanLevelData = {
    slug: SuperfanLevelSlug.FREE,
    value: 0,
    copyKey: '0',
    stripePriceId: null
  };

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
    trackEvent(PlausibleEvent.CONTINUE_WITH_PRICE, {
      source: analyticsSource,
      membership_type: level.slug
    });
    return await goto(
      `${routes.MEMBER_PAYMENT}/${level.slug}${
        continueUrl ? `?continueUrl=${encodeURIComponent(continueUrl)}` : ''
      }`
    );
  };

  const optionIdPrefix = 'pricing-btn-';
</script>

<div class="container">
  <div class="pricing-description">
    <h3 id="pricing-title">{$t('become-superfan.pricing-section.title')}</h3>
    <p id="pricing-description">{$t('become-superfan.pricing-section.description')}</p>
  </div>
  <div
    class="membership-levels"
    class:condensed
    class:full
    role={isMobile ? undefined : 'radiogroup'}
    aria-labelledby="pricing-title"
    aria-describedby="pricing-description"
  >
    {#each visibleLevels as level, index}
      <MembershipLevel
        {full}
        {...addPricingLevelCopy(level)}
        selected={level.slug === selectedLevel.slug}
        embeddable={condensed}
        isLabelFor={isMobile ? undefined : optionIdPrefix + index}
        on:click={() => selectLevel(level)}
        on:keypress={(e) => handleKeyPress(e, level)}
      />
    {/each}
  </div>
  {#if full && !isMobile}
    <SliderRadio bind:selectedOption={selectedRadioOption} {optionIdPrefix} />
  {/if}
  <div class="terms-checkbox">
    <LabeledCheckbox name="accept-terms" bind:checked={acceptedTerms}
      >{@html $_('become-superfan.pricing-section.terms-label', {
        values: {
          termsLink: anchorText({
            href: routes.RULES,
            track: [PlausibleEvent.VISIT_RULES, { source: analyticsSource }],
            linkText: $_('become-superfan.pricing-section.terms-link-text'),
            class: 'link'
          })
        }
      })}</LabeledCheckbox
    >
    {#if continueError}
      <p class="error">{continueError}</p>
    {/if}
  </div>

  <div class="select-level-button">
    <Button
      uppercase
      orange={selectedLevel.slug != SuperfanLevelSlug.FREE}
      arrow
      disabled={(selectedLevel.slug === SuperfanLevelSlug.FREE && !!$user) || $user?.superfan}
      on:click={() => {
        if (!acceptedTerms) {
          continueError = $_('register.validate.consent');
          return;
        }
        if (selectedLevel.slug === SuperfanLevelSlug.FREE) {
          goto(routes.REGISTER);
          return;
        }
        goToPaymentPage(selectedLevel);
      }}
    >
      {#if selectedLevel.slug === SuperfanLevelSlug.REDUCED}
        {$_('generics.become-member')}
      {:else if selectedLevel.slug === SuperfanLevelSlug.NORMAL}
        {$_('generics.become-superfan')}
      {:else}
        {$_('garden.form.register-link-text')}
      {/if}
    </Button>
    {#if $user?.superfan}
      <p class="notice">
        {$_('become-superfan.pricing-section.already-member', {
          values: {
            type:
              $user.stripeSubscription?.priceId === import.meta.env.VITE_STRIPE_PRICE_ID_REDUCED
                ? $_('generics.member')
                : $user.stripeSubscription?.priceId === import.meta.env.VITE_STRIPE_PRICE_ID_NORMAL
                ? $_('generics.superfan')
                : 'member'
          }
        })}
      </p>
    {/if}
  </div>
  <p class="fineprint">
    {$t('become-superfan.pricing-section.questions')}{' '}<Anchor
      href={createUrl(routes.ABOUT_MEMBERSHIP, {}, 'faq')}
      on:click={() => trackEvent(PlausibleEvent.VISIT_MEMBERSHIP_FAQ, { source: analyticsSource })}
      newtab={$page.url.pathname !== routes.ABOUT_MEMBERSHIP}
      >{$t('become-superfan.pricing-section.faq-link-text')}</Anchor
    >
    {$t('become-superfan.pricing-section.blog-post')}
    <Anchor
      href={membershipBlogLink($_, {
        // Old value: 'pricing_modal'
        utm_content: analyticsSource
      })}
      newtab>{$t('become-superfan.pricing-section.blog-post-link-text')}</Anchor
    >
  </p>
</div>

<svelte:window bind:innerWidth />

<style>
  p.notice {
    display: block;
    margin-top: 1rem;
  }
  .error {
    color: var(--color-danger);
  }
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
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .terms-checkbox :global(label[for='accept-terms']) {
    line-height: 1.4;
  }

  p.fineprint {
    text-align: center;
    font-size: 1.4rem;
  }

  .terms-checkbox :global(input[name='accept-terms']) {
    min-width: 2rem;
    height: 2rem;
    margin-right: 1.3rem;
  }

  .terms-checkbox {
    max-width: 1000px;
    width: fit-content;
    margin: auto;
  }
  .terms-checkbox > .error {
    margin-left: 3.5rem;
    margin-top: 1rem;
    line-height: 1.5;
  }

  @media screen and (min-width: 850px) {
    .membership-levels.full {
      flex-direction: row;
    }
    .membership-levels.full {
      align-items: stretch;
    }
  }
</style>
