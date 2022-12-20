<script lang="ts">
  import { _ } from 'svelte-i18n';
  import Button from '@/lib/components/UI/Button.svelte';
  import routes from '@/lib/routes';
  import Heading from '../_components/Heading.svelte';
  import MarketingBlock from '../_components/MarketingBlock.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Features from '../_sections/Features.svelte';
  import InnerVideoSection from '../_sections/VideoSection.svelte';
  import SupportReasons from '../_sections/SupportReasons.svelte';
  import CollapsibleGroup from '@/lib/components/CollapsibleGroup.svelte';
  import Testimonials from '../_components/Testimonials.svelte';
  import type { Slide } from '../_components/Testimonials.svelte';
  import { coreTeamProfiles } from '../_static/profiles';
  import ProfilePicture from '../_components/ProfilePicture.svelte';
  import { SUPERFAN_PRICING_ROUTE, SUPPORT_EMAIL } from '@/lib/constants';
  import { getNodeKeys } from '@/lib/util/get-node-children';

  const testimonials: Slide[] = [
    {
      quote:
        'Starting to travel by bicycle crystallized what I wanted to become: free, minimalist, autonomous and active.',
      name: 'Boris',
      imagePath: '/testimonials/boris.jpeg'
    },
    {
      quote: 'WTMG is not only fun, it’s about changing the world, changing the way we travel.',
      name: 'Marie Marth',
      imagePath: '/testimonials/marie-marth.jpg'
    },
    {
      quote:
        "I'm happy to be surrounded by such an amazing community of slow travellers who put their actions where their mouth is!",
      name: 'Benoit & Hélène',
      imagePath: '/testimonials/benoit-helene.jpg'
    }
  ];
</script>

<PaddedSection desktopOnly>
  <MarketingBlock backgroundColor="var(--color-green-light)" centered>
    <h1>Superfans keep us going</h1>
    <p>
      We want to create a community space where people can meet and talk, both online and offline.
    </p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <InnerVideoSection>
    <h1 slot="heading">Why become a Superfan</h1>
    <div slot="text">
      <p>
        If you are truly passionate about slow travel and you want to support WTMG’s mission, then
        perhaps you should become a Superfan! With your financial support, we can make WTMG
        financially stable and keep it free for everyone to use! You pay only what you can afford.
      </p>
      <p>
        We’re a small team of five and have invested a lot of our personal time, energy and money in
        this initiative. We started off as a small citizen initiative in Belgium, but we are growing
        into something bigger. It’s clear that WTMG is here to stay, and we want to make sure we can
        survive as well as thrive. And that’s where you come in!
      </p>
      <Button href={SUPERFAN_PRICING_ROUTE} uppercase orange arrow>Become a Superfan</Button>
    </div>
  </InnerVideoSection>
</PaddedSection>
<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <Heading caption="What’s in it for you?">Our Superfans deserve a massive thank you</Heading>
  <p>
    We can’t do without your support! As a Superfan, you will get access to some great new slow
    travel tools! These will make planning your slow travel adventures even easier. This is our way
    to say thank you for believing in us.
  </p>
  <Features />
  <div style="width: 100%; padding-bottom: var(--section-inner-padding)" />
  <Heading caption="WTMG for everyone">Thanks to your support, we can...</Heading>
  <!-- TODO: change content -->
  <SupportReasons />
  <Button href={SUPERFAN_PRICING_ROUTE} uppercase orange arrow>Become a Superfan</Button>
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
    <h1>Meet the team</h1>
    <p>
      So, who’s behind WTMG? We’re a small team of five slow travel enthusiasts and we want to help
      others embark on their slow travel adventures too!
    </p>
    <Button href={routes.ABOUT_US} uppercase orange arrow>Meet the Team</Button>
  </MarketingBlock>
</PaddedSection>
<PaddedSection desktopOnly>
  <Testimonials slides={testimonials} />
</PaddedSection>
<PaddedSection>
  <h2>FAQ</h2>
  {#each getNodeKeys('about-superfan.faq-sections') as sectionKey}
    <div class="faq-section">
      <h3 class="faq-title">{$_(`about-superfan.faq-sections.${sectionKey}.title`)}</h3>
      <CollapsibleGroup collapsibleKey={`about-superfan.faq-sections.${sectionKey}.questions`} />
    </div>
  {/each}
</PaddedSection>
<PaddedSection>
  <div class="more-questions">
    <h2>Still have a question?</h2>
    <Button
      href="mailto:{SUPPORT_EMAIL}?subject={encodeURIComponent('WTMG, I have a question!')}"
      uppercase>Contact Us</Button
    >
  </div>
</PaddedSection>

<style>
  div.more-questions {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  div.team-pictures {
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

  .faq-title {
    display: inline-block;
    margin-bottom: 1.5rem;
  }
</style>
