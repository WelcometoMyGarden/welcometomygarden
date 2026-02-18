<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
  import { Button } from '$lib/components/UI';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import MarketingBlock from '$lib/components/Marketing/MarketingBlock.svelte';
  import MediaSection from '$lib/components/Marketing/sections/MediaSection.svelte';
  import HeadingSection from '$lib/components/Marketing/Heading.svelte';
  import LandingSection from './_sections/LandingSection.svelte';
  import StepsSection from './_sections/StepsSection.svelte';
  import LearnMoreArrow from './_sections/LearnMoreArrowSection.svelte';
  import Testimonials, { type Slide } from '$lib/components/Marketing/Testimonials.svelte';
  import { onDestroy } from 'svelte';
  import katlijnFrankImg from '$lib/assets/testimonials/katlijn-frank.jpg?as=run&w=1280';
  import carolienFamilyImg from '$lib/assets/testimonials/carolien-family.jpg?as=run&w=1280';
  import gardenImg from '$lib/assets/testimonials/garden.jpeg?as=run&w=1280';
  import { anchorText, lr, membershipBlogLink } from '$lib/util/translation-helpers';
  import { user } from '$lib/stores/auth';
  import createUrl from '$lib/util/create-url';
  import { goto } from '$lib/util/navigate';
  import trackEvent from '$lib/util/track-plausible';
  import { PlausibleEvent } from '$lib/types/Plausible';
  import SocialProof from '$lib/components/Marketing/SocialProof.svelte';
  import MarketingStyleWrapper from '$lib/components/Marketing/MarketingStyleWrapper.svelte';
  import CommunityVideo from '$lib/components/Marketing/CommunityVideo.svelte';

  const contentOf = (quoteNumber: string) => {
    const prefix = `index.wtmg-quotes.${quoteNumber}`;
    return {
      name: $_(prefix + '.name'),
      quote: $_(prefix + '.quote')
    };
  };

  let membershipUrlWithParams = $derived(
    createUrl($lr(routes.ABOUT_MEMBERSHIP), {}, $user?.superfan ? '' : 'pricing')
  );

  const setTestimonials = () => {
    testimonials = [
      {
        ...contentOf('0'),
        image: katlijnFrankImg
      },
      {
        ...contentOf('1'),
        image: carolienFamilyImg
      },
      {
        ...contentOf('2'),
        image: gardenImg
      }
    ];
  };

  // TODO: we're repeating this code
  let testimonials: Slide[] = $state();
  setTestimonials();

  let showVersion = $state(false);

  const unsubscribeLocalization = _.subscribe(() => {
    setTestimonials();
  });

  onDestroy(() => {
    unsubscribeLocalization();
  });
</script>

<svelte:head>
  <title>{$_('generics.home')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<MarketingStyleWrapper>
  <LandingSection />
  <LearnMoreArrow />
  <StepsSection />
  <!-- Membership section -->
  <PaddedSection desktopOnly nosnippet>
    <MarketingBlock backgroundColor="var(--color-beige-light)">
      <MediaSection>
        {#snippet heading()}
          <HeadingSection caption={$_('index.superfan.subtitle')}>
            {$_('index.superfan.become-superfan-title')}
          </HeadingSection>
        {/snippet}
        {#snippet text()}
          <div>
            {@html $_('about-superfan.video-section.description')}
            <div class="become-superfan-buttons">
              <!-- If the user is already a member, we don't use CTA copy (or links) that push to pay -->
              <div>
                <Button
                  href={membershipUrlWithParams}
                  preventing
                  onclick={() => {
                    trackEvent(PlausibleEvent.VISIT_ABOUT_MEMBERSHIP, { source: 'home_section' });
                    goto(membershipUrlWithParams);
                  }}
                  uppercase
                  orange
                  arrow
                  minWidth="20rem"
                >
                  {#if $user?.superfan}
                    {$_('index.intro.learn-more')}
                  {:else}
                    {$_('generics.become-member')}
                  {/if}
                </Button>
                <SocialProof centerRelative />
              </div>
              <Button
                href={membershipBlogLink($_, {
                  utm_content: 'homepage'
                })}
                uppercase
                inverse
                link
                orange
                xsmall
                target="_blank">{$_('about-superfan.video-section.blog-link-text')}</Button
              >
            </div>
          </div>
        {/snippet}
      </MediaSection>
    </MarketingBlock>
  </PaddedSection>
  <CommunityVideo />
  <PaddedSection desktopOnly>
    <Testimonials slides={testimonials} />
  </PaddedSection>
  <PaddedSection desktopOnly>
    <div class="faq" id="faq">
      <div class="card faq-intro">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <h2
          onclick={() => (showVersion = !showVersion)}
          class="oh1 faq-title heading-underline heading-underline--center"
        >
          {$_('index.faq.title')}
        </h2>
        {#if showVersion}
          <div style="margin-bottom: 1rem; color: white; font-weight: 600;">
            WTMG version: {__COMMIT_HASH__}
          </div>
        {/if}
        <p>
          {@html $_('index.faq.copy', {
            values: {
              faqLink: anchorText({
                href: $lr(routes.FAQ),
                linkText: $_(`index.faq.faq-link-text`),
                newtab: false
              })
            }
          })}
        </p>
      </div>
      <div class="faq-questions">
        <CollapsibleGroup collapsibleKey={'index.faq.questions'} />
      </div>
    </div>
  </PaddedSection>
</MarketingStyleWrapper>

<style>
  :global(.orange-links a) {
    font-weight: bold;
    text-decoration: underline;
    color: var(--color-orange);
  }

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
    flex: 1;
  }

  .card p {
    line-height: 3.2rem;
    text-align: center;
  }

  .faq {
    display: flex;
  }

  .faq-title {
    /* Align the underline ::after */
    padding-bottom: 3.5rem;
  }

  .faq-intro {
    background-color: var(--color-green);
    width: 50%;
    padding: 6rem 6rem;
    text-align: center;
  }

  .faq-questions {
    width: 50%;
    display: flex;
  }
  .faq-intro h2 {
    color: var(--color-white);
  }

  .faq-intro p {
    color: var(--color-white);
    line-height: 3.2rem;
  }

  .faq-intro :global(a) {
    color: var(--color-white);
    text-decoration: underline;
  }

  @media only screen and (max-width: 1300px) {
    .faq-intro {
      padding: 6rem 10rem;
    }
  }

  @media only screen and (max-width: 1150px) {
    .faq {
      flex-direction: column;
      margin-bottom: 0;
    }

    .faq > * {
      width: 100%;
    }

    .faq-intro {
      padding: 6rem 12rem 8rem;
      flex: 0;
    }
  }

  @media only screen and (max-width: 1000px) {
    .faq-intro {
      padding: 6rem 10rem 8rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .faq-intro {
      padding: 4rem 8rem 6rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .faq-intro {
      padding: 4rem 4rem 6rem;
    }

    .become-superfan-buttons {
      flex-direction: column;
      align-items: center;
    }
  }

  @media only screen and (max-width: 400px) {
    .faq-intro {
      padding: 4rem 3rem 6rem;
    }

    .faq-intro p {
      line-height: 2.6rem;
    }

    .card p {
      line-height: 2.6rem;
    }
  }
</style>
