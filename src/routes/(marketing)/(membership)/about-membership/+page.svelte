<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import Button from '$lib/components/UI/Button.svelte';
  import routes from '$lib/routes';
  import Heading from '../../_components/Heading.svelte';
  import MarketingBlock from '../../_components/MarketingBlock.svelte';
  import PaddedSection from '../../_components/PaddedSection.svelte';
  import InnerVideoSection from '../../_sections/MediaSection.svelte';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
  import Testimonials from '../../_components/Testimonials.svelte';
  import type { Slide } from '../../_components/Testimonials.svelte';
  import { coreTeamProfiles } from '../../_static/profiles';
  import ProfilePicture from '../../_components/ProfilePicture.svelte';
  import { PRICING_ROUTE, SUPPORT_EMAIL } from '$lib/constants';
  import { getNodeKeys } from '$lib/util/get-node-children';
  import { onDestroy } from 'svelte';
  import { valuePoints } from '../membership-points';
  import ValuePoint from '$routes/(marketing)/(membership)/ValuePoint.svelte';
  import MembershipPricing from '../MembershipPricing.svelte';

  import lievenImg from '$lib/assets/testimonials/lieven.jpeg?run&width=1280';
  import borisImg from '$lib/assets/testimonials/boris.jpeg?run&width=840';
  import marieMarthImg from '$lib/assets/testimonials/marie-marth.jpg?run&width=1280';
  import benoitHeleneImg from '$lib/assets/testimonials/benoit-helene.jpg?run&width=1600';

  let testimonials: Slide[];

  const contentOfQuote = (quoteNumber: string) => {
    const prefix = `about-superfan.superfan-quotes-section.quotes.${quoteNumber}`;
    return {
      name: $_(prefix + '.name'),
      quote: $_(prefix + '.quote')
    };
  };

  $: valuePointsLocal = valuePoints($locale ?? 'en');

  const setTestimonials = () => {
    testimonials = [
      {
        ...contentOfQuote('0'),
        image: lievenImg
      },
      {
        ...contentOfQuote('1'),
        image: borisImg
      },
      {
        ...contentOfQuote('2'),
        image: marieMarthImg
      },
      {
        ...contentOfQuote('3'),
        image: benoitHeleneImg
      }
    ];
  };

  setTestimonials();

  const unsubscribeLocalization = _.subscribe(() => {
    setTestimonials();
  });
  onDestroy(() => {
    unsubscribeLocalization();
  });
</script>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical topMargin={false}>
  <InnerVideoSection decoration={true}>
    <h1 slot="heading">{$_('about-superfan.video-section.title')}</h1>
    <div slot="text" class="video-text">
      {@html $_('about-superfan.video-section.description')}
      <div class="become-superfan-buttons">
        <Button href={PRICING_ROUTE} uppercase orange arrow>{$_('generics.become-member')}</Button>
        <Button href={routes.ABOUT_MEMBERSHIP} uppercase inverse link xsmall
          >{$_('about-superfan.video-section.blog-link-text')}</Button
        >
      </div>
    </div>
  </InnerVideoSection>
</PaddedSection>
<PaddedSection vertical>
  <Heading caption={$_('about-superfan.for-superfans-section.slug')}
    >{$_('about-superfan.for-superfans-section.title')}</Heading
  >
  <div>
    <ul class="value-points">
      {#each valuePointsLocal as item}
        <ValuePoint {...item} border />
      {/each}
    </ul>
  </div>
  <div style="margin-bottom: var(--spacing-medium)" />
</PaddedSection>
<PaddedSection backgroundColor="var(--color-beige-light" vertical>
  <MembershipPricing full />
</PaddedSection>
<PaddedSection desktopOnly>
  <MarketingBlock centered backgroundColor="var(--color-beige-light">
    <div class="team-pictures">
      {#each Object.values(coreTeamProfiles) as profileData}
        <div class="image-wrapper">
          <ProfilePicture {...profileData} />
        </div>
      {/each}
    </div>
    <h2 class="team-title">{$_('about-superfan.team-section.title')}</h2>
    <p class="team-text">{$_('about-superfan.team-section.description')}</p>
    <Button href={routes.ABOUT_US} uppercase orange arrow centered
      >{$_('about-superfan.team-section.meet-team-button')}</Button
    >
  </MarketingBlock>
</PaddedSection>
<PaddedSection desktopOnly>
  <Testimonials slides={testimonials} />
</PaddedSection>
<PaddedSection desktopOnly>
  <h2 class="faq-heading">{$_('about-superfan.faq-section.title')}</h2>
  {#each getNodeKeys('about-superfan.faq-section.faq-subsections') as sectionKey}
    <div class="faq-section">
      <h3 class="faq-title">
        {$_(`about-superfan.faq-section.faq-subsections.${sectionKey}.title`)}
      </h3>
      <CollapsibleGroup
        collapsibleKey={`about-superfan.faq-section.faq-subsections.${sectionKey}.questions`}
      />
    </div>
  {/each}
</PaddedSection>
<PaddedSection>
  <div class="more-questions">
    <h2>{$_('about-superfan.faq-section.contact-section.title')}</h2>
    <!-- TODO: fix the mailto localization -->
    <Button
      href="mailto:{SUPPORT_EMAIL}?subject={encodeURIComponent('WTMG, I have a question!')}"
      uppercase>{$_('about-superfan.faq-section.contact-section.contact-button')}</Button
    >
  </div>
</PaddedSection>

<style>
  .become-superfan-buttons {
    display: flex;
    gap: 1.5rem;
  }
  .become-superfan-buttons :global(> *:first-child) {
    flex: 1;
  }
  .become-superfan-buttons :global(> *:last-child) {
    flex: 2;
  }

  ul.value-points {
    display: grid;
    width: 100%;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
  }

  @media only screen and (max-width: 500px) {
    .become-superfan-buttons {
      flex-direction: column;
      align-items: center;
    }
  }

  .more-questions {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .team-title,
  :global(div) p.team-text {
    margin-bottom: 1rem;
  }

  /* Not an ideal escape, maybe MarketingBlock should
    contain less strict styling. */
  :global(div) p.team-text {
    display: inline-block;
    max-width: 49rem;
  }

  .team-pictures {
    display: flex;
    justify-content: center;
    width: 100%;
    /* Compensate for the negative margins below */
    transform: translateX(1.75rem);
  }

  .image-wrapper {
    /* This gives the elements a concrete width */
    max-width: 18rem;
    flex-grow: 1;
    max-height: 100%;
    margin-left: -3.5rem;
  }

  .faq-section {
    margin-bottom: var(--section-inner-padding);
  }

  .faq-heading {
    text-align: center;
  }

  .faq-title {
    display: inline-block;
    margin-bottom: 2rem;
    padding: 0 var(--spacing-collapsible-item-hor);
  }

  @media screen and (max-width: 1050px) {
    /* Center the video section button, only when it collapses */
    .video-text :global(.button) {
      margin: auto;
    }
  }
</style>
