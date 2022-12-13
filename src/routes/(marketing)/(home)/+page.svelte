<script>
  import { _ } from 'svelte-i18n';
  import routes from '$lib/routes';
  import CollapsibleGroup from '$lib/components/CollapsibleGroup.svelte';
  import { Button, Partner } from '$lib/components/UI';
  import { DONATION_URL } from '$lib/constants';

  import SlowbyBanner from '$lib/components/Temporary/SlowbyBanner.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import MarketingBlock from '../_components/MarketingBlock.svelte';
  import InnerVideoSection from '../_sections/VideoSection.svelte';
  import HeadingSection from '../_components/Heading.svelte';
  import LandingSection from './_sections/LandingSection.svelte';
  import StepsSection from './_sections/StepsSection.svelte';
  import LearnMoreArrow from './_sections/LearnMoreArrowSection.svelte';
</script>

<svelte:head>
  <title>{$_('generics.home')} | Welcome To My Garden</title>
</svelte:head>

<SlowbyBanner />

<LandingSection />
<LearnMoreArrow />
<StepsSection />
<PaddedSection desktopOnly>
  <MarketingBlock backgroundColor="var(--color-beige-light)">
    <InnerVideoSection>
      <HeadingSection caption="New: support our mission">Support WTMG: become a Superfan!</HeadingSection>
      <p>
        Welcome To My Garden is on a mission to make slow travel more accessible for everyone. Like
        any garden, WTMG needs nurturing in order to grow and stay healthy.
      </p>
      <p>
        With your financial support, WTMG can remain free for everyone to use! Will you help us make
        WTMG survive and thrive? Become a Superfan and get access to new features!
      </p>
      <div>
        <Button href={routes.BECOME_SUPERFAN}>Become a superfan</Button>
        <Button href={routes.ABOUT_SUPERFAN} inverse>Learn more</Button>
      </div>
    </InnerVideoSection>
  </MarketingBlock>
</PaddedSection>

<section class="faq" id="faq">
  <div class="card faq-intro">
    <h1 class="heading-underline-center">{$_('index.faq.title')}</h1>
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
</section>

<section class="cooperation" id="cooperation">
  <div class="card cooperation-card support">
    <div class="cooperation-content orange-links">
      <h1 class="heading-underline-center">{$_('index.support.title')}</h1>
      <p>
        {@html $_('index.support.copy', {
          values: {
            donationLink: `<a href="${DONATION_URL}" target="_blank"  rel="noreferrer"  rel="noopener noreferrer">${$_(
              'index.support.donation-link-text'
            )}</a>`
          }
        })}
      </p>
    </div>
  </div>
</section>

<style>

  :global(.orange-links a) {
    font-weight: bold;
    text-decoration: underline;
    color: var(--color-orange);
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
    padding: 6rem 15rem;
    text-align: center;
  }

  .faq-questions {
    width: 50%;
    display: flex;
  }
  .faq-intro h1 {
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

  .cooperation {
    display: flex;
  }

  .cooperation h1 {
    margin-bottom: 4.6rem;
  }

  .cooperation-card {
    display: grid;
    grid-template-rows: 0.5fr;
    text-align: center;
    width: 50%;
    padding: 10rem;
  }

  .support {
    background-color: var(--color-beige-light);
  }

  @media only screen and (max-width: 1500px) {
    .faq-intro {
      padding: 6rem 10rem;
    }
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

    .cooperation {
      flex-direction: column;
    }

    .cooperation > * {
      width: 100%;
    }

    .cooperation-card {
      padding-top: 10rem;
    }

    .support {
      order: 1;
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

    .cooperation-card {
      padding: 8rem 8rem 10rem;
    }
  }

  @media only screen and (max-width: 500px) {
    .faq-intro {
      padding: 4rem 4rem 6rem;
    }

    .cooperation-card {
      padding: 8rem 4rem 10rem;
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

    .cooperation-card {
      padding: 8rem 3rem 10rem;
    }
  }
</style>
