<script lang="ts">
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
  import { Button } from '$lib/components/UI';

  import PaddedSection from '../_components/PaddedSection.svelte';
  import MarketingBlock from '../_components/MarketingBlock.svelte';
  import VideoSection from '../_sections/VideoSection.svelte';
  import HeadingSection from '../_components/Heading.svelte';
  import LandingSection from './_sections/LandingSection.svelte';
  import StepsSection from './_sections/StepsSection.svelte';
  import LearnMoreArrow from './_sections/LearnMoreArrowSection.svelte';
  import Testimonials, { type Slide } from '../_components/Testimonials.svelte';
  const testimonials: Slide[] = [
    {
      quote:
        'We love hearing the stories of slow travellers. Some just started, others travel with children. Everyone has a story.',
      name: 'Frank & Katlijn',
      imagePath: '/testimonials/katlijn-frank.jpg'
    },
    {
      quote:
        'Apparently WTMG doesn’t only bring together people but also animals. We were kindly welcomed with our donkeys!',
      name: 'Carolien and her family',
      imagePath: '/testimonials/carolien-family.jpg'
    },
    {
      quote:
        'Thanks to WTMG and to the slow travellers I’ve been hosting, I’m rediscovering my own region on foot now. I see everything from a new perspective and it’s fascinating.',
      name: 'Marie Marth',
      imagePath: '/testimonials/garden.jpeg'
    }
  ];
</script>

<svelte:head>
  <title>{$_('generics.home')} | Welcome To My Garden</title>
</svelte:head>

<LandingSection />
<LearnMoreArrow />
<StepsSection />
<PaddedSection desktopOnly>
  <MarketingBlock backgroundColor="var(--color-beige-light)">
    <VideoSection>
      <HeadingSection slot="heading" caption="New: support our mission"
        >Support WTMG: become a Superfan!</HeadingSection
      >
      <div slot="text">
        <p>
          Welcome To My Garden is on a mission to make slow travel more accessible for everyone.
          Like any garden, WTMG needs nurturing in order to grow and stay healthy.
        </p>
        <p>
          With your financial support, WTMG can remain free for everyone to use! Will you help us
          make WTMG survive and thrive? Become a Superfan and get access to new features!
        </p>
        <div class="become-superfan-buttons">
          <Button href={routes.BECOME_SUPERFAN}>Become a superfan</Button>
          <Button href={routes.ABOUT_SUPERFAN} inverse>Learn more</Button>
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
      <h2 class="oh1 heading-underline-center">{$_('index.faq.title')}</h2>
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
