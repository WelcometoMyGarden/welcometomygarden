<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Button from '$lib/components/UI/Button.svelte';
  import routes from '$lib/routes';
  import Heading from '$lib/components/Marketing/Heading.svelte';
  import MarketingBlock from '$lib/components/Marketing/MarketingBlock.svelte';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import InnerVideoSection from '$lib/components/Marketing/sections/MediaSection.svelte';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
  import Testimonials from '$lib/components/Marketing/Testimonials.svelte';
  import type { Slide } from '$lib/components/Marketing/Testimonials.svelte';
  import ProfilePicture from '$lib/components/Marketing/ProfilePicture.svelte';
  import { getNodeKeys } from '$lib/util/get-node-children';
  import { onDestroy, onMount } from 'svelte';
  import smoothscroll from 'smoothscroll-polyfill';

  import lievenImg from '$lib/assets/testimonials/lieven.jpeg?as=run&w=1280';
  import borisImg from '$lib/assets/testimonials/boris.jpeg?as=run&w=840';
  import marieMarthImg from '$lib/assets/testimonials/marie-marth.jpg?as=run&w=1280';
  import benoitHeleneImg from '$lib/assets/testimonials/benoit-helene.jpg?as=run&w=1600';
  import ValuePoints from './ValuePoints.svelte';
  import { membershipBlogLink } from '$lib/util/translation-helpers';
  import capitalize from '$lib/util/capitalize';
  import { page } from '$app/stores';
  import { user } from '$lib/stores/auth';
  import MarketingStyleWrapper from '$lib/components/Marketing/MarketingStyleWrapper.svelte';
  import { coreTeamProfiles } from '$lib/components/Marketing/static/profiles';
  import MembershipPricing from '$lib/components/Membership/MembershipPricing.svelte';
  import SocialProof from '$lib/components/Marketing/SocialProof.svelte';
  import { browser } from '$app/environment';

  if (browser) {
    smoothscroll.polyfill();
  }

  onMount(() => {
    if ($page?.url.hash.includes('pricing')) {
      const pricingElem = document.getElementById('pricing');
      if (pricingElem) {
        const topOfPricingElem = pricingElem.offsetTop;
        window.scroll({ top: topOfPricingElem, behavior: 'smooth' });
      }
    } else if ($page?.url.hash.includes('faq')) {
      const faqElem = document.getElementById('faq');
      if (faqElem) {
        const topOfFaqElem = faqElem.offsetTop;
        window.scroll({ top: topOfFaqElem, behavior: 'smooth' });
      }
    }
  });

  let testimonials: Slide[];

  const contentOfQuote = (quoteNumber: string) => {
    const prefix = `about-superfan.superfan-quotes-section.quotes.${quoteNumber}`;
    return {
      name: $_(prefix + '.name'),
      quote: $_(prefix + '.quote')
    };
  };

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

<MarketingStyleWrapper>
  <PaddedSection backgroundColor="var(--color-beige-light)" vertical topMargin={false}>
    <InnerVideoSection decoration={true}>
      <h1 slot="heading">{$_('about-superfan.video-section.title')}</h1>
      <div slot="text" class="video-text">
        {@html $_('about-superfan.video-section.description')}
        <div class="become-superfan-buttons">
          {#if !$user?.superfan}
            <div>
              <Button
                href="{routes.ABOUT_MEMBERSHIP}#pricing"
                uppercase
                orange
                arrow
                minWidth="20rem">{$_('generics.become-member')}</Button
              >
              <SocialProof centerRelative />
            </div>
          {/if}
          <Button
            href={membershipBlogLink($_, {
              utm_content: 'about_membership_header'
            })}
            target="_blank"
            uppercase
            inverse
            link
            orange
            xsmall>{$_('about-superfan.video-section.blog-link-text')}</Button
          >
        </div>
      </div>
    </InnerVideoSection>
  </PaddedSection>
  <PaddedSection>
    <Heading caption={$_('about-superfan.for-superfans-section.slug')}
      >{$_('about-superfan.for-superfans-section.title')}</Heading
    >
    <ValuePoints />
    <div style="margin-bottom: var(--spacing-medium)" />
  </PaddedSection>
  <PaddedSection backgroundColor="var(--color-beige-light" vertical id="pricing">
    <MembershipPricing full analyticsSource="about_membership" />
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
  <PaddedSection desktopOnly id="faq">
    <h2 class="faq-heading">{$_('about-superfan.faq-section.title')}</h2>
    {#each getNodeKeys('about-superfan.faq-section.faq-subsections') as sectionKey}
      <div class="faq-section">
        <h3 class="faq-title">
          {$_(`about-superfan.faq-section.faq-subsections.${sectionKey}.title`, { default: '' })}
        </h3>
        <CollapsibleGroup
          collapsibleKey={`about-superfan.faq-section.faq-subsections.${sectionKey}.questions`}
        />
      </div>
    {/each}
  </PaddedSection>
  <PaddedSection>
    <div class="more-questions">
      <h2>{capitalize($_('become-superfan.pricing-section.blog-post-link-text'))}</h2>
      <Button
        href={membershipBlogLink($_, {
          utm_campaign: 'membership',
          utm_content: 'membership_faq'
        })}
        uppercase
        target="_blank">{$_('about-superfan.faq-section.contact-section.contact-button')}</Button
      >
    </div>
  </PaddedSection>
</MarketingStyleWrapper>

<style>
  .become-superfan-buttons {
    display: flex;
    gap: 1.5rem;
  }

  .become-superfan-buttons :global(> *:first-child) {
    /* Constrains the container. Makes sure the superfan count text collapses to the size of the button
    above it (which is of fixed size by the max-content below) */
    width: min-content;
  }
  .become-superfan-buttons :global(> *:first-child .button) {
    /* Forces the button content text to be on one line,
       but still constrains the size to the content*/
    width: max-content;
  }
  .become-superfan-buttons :global(> *:last-child) {
    flex: 1.2;
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
</style>
