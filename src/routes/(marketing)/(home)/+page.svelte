<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
  import { Button } from '$lib/components/UI';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import MarketingBlock from '../_components/MarketingBlock.svelte';
  import VideoSection from '../_sections/MediaSection.svelte';
  import HeadingSection from '../_components/Heading.svelte';
  import LandingSection from './_sections/LandingSection.svelte';
  import StepsSection from './_sections/StepsSection.svelte';
  import LearnMoreArrow from './_sections/LearnMoreArrowSection.svelte';
  import Testimonials, { type Slide } from '../_components/Testimonials.svelte';
  import { onDestroy } from 'svelte';

  import katlijnFrankImg from '$lib/assets/testimonials/katlijn-frank.jpg?run&width=1280';
  import carolienFamilyImg from '$lib/assets/testimonials/carolien-family.jpg?run&width=1280';
  import gardenImg from '$lib/assets/testimonials/garden.jpeg?run&width=1280';

  const contentOf = (quoteNumber: string) => {
    const prefix = `index.wtmg-quotes.${quoteNumber}`;
    return {
      name: $_(prefix + '.name'),
      quote: $_(prefix + '.quote')
    };
  };

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
  let testimonials: Slide[];
  setTestimonials();

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

<LandingSection />
<LearnMoreArrow />
<StepsSection />
<PaddedSection desktopOnly>
  <MarketingBlock backgroundColor="var(--color-beige-light)">
    <VideoSection>
      <HeadingSection slot="heading" caption={$_('index.superfan.subtitle')}>
        {$_('index.superfan.become-superfan-title')}
      </HeadingSection>
      <div slot="text">
        {@html $_('about-superfan.video-section.description')}
        <div class="become-superfan-buttons">
          <Button href={routes.BECOME_MEMBER} uppercase orange arrow
            >{$_('generics.become-member')}</Button
          >
          <Button href={routes.ABOUT_MEMBERSHIP} uppercase inverse link
            >{$_('index.superfan.learn-more')}</Button
          >
        </div>
      </div>
    </VideoSection>
  </MarketingBlock>
</PaddedSection>
<PaddedSection desktopOnly>
  <Testimonials slides={testimonials} />
</PaddedSection>
<PaddedSection desktopOnly>
  <div class="faq" id="faq">
    <div class="card faq-intro">
      <h2 class="oh1 faq-title heading-underline heading-underline--center">
        {$_('index.faq.title')}
      </h2>
      <p>
        {@html $_('index.faq.copy', {
          values: {
            faqLink: `<a href=${routes.FAQ}>${$_(`index.faq.faq-link-text`)}</a>`
          }
        })}
      </p>
    </div>
    <div class="faq-questions">
      <CollapsibleGroup collapsibleKey={'index.faq.questions'} />
    </div>
  </div>
</PaddedSection>

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
