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

  let testimonials: Slide[];
  $: testimonials = [
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
    <h1>{$_('about-superfan.top-section.title')}</h1>
    <p>{$_('about-superfan.top-section.description')}</p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
  <InnerVideoSection>
    <h1 slot="heading">{$_('about-superfan.video-section.title')}</h1>
    <div slot="text">
      {@html $_('about-superfan.video-section.description')}
      <Button href={SUPERFAN_PRICING_ROUTE} uppercase orange arrow>Become a Superfan</Button>
    </div>
  </InnerVideoSection>
</PaddedSection>
<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <Heading caption={$_('about-superfan.for-superfans-section.slug')}
    >{$_('about-superfan.for-superfans-section.title')}</Heading
  >
  <p>{$_('about-superfan.for-superfans-section.description')}</p>
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
  <h2>{$_('about-superfan.faq-section.title')}</h2>
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
