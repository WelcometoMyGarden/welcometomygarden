<script lang="ts">
  import MarketingBlock from '@/routes/(marketing)/_components/MarketingBlock.svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Profile from '../_components/Profile.svelte';

  const michielImg = staticAssetUrl('/profile-pictures/michiel.png');
  const marieImg = staticAssetUrl('/profile-pictures/marie.jpg');
  const ismailaImg = staticAssetUrl('/profile-pictures/ismaila.jpg');
  const brentImg = staticAssetUrl('/profile-pictures/brent.jpg');

  import OurStorySection from './OurStorySection.svelte';
  import ContributeSection from './ContributeSection.svelte';
  import Heading from '../_components/Heading.svelte';
  import Text from '$lib/components/UI/Text.svelte';
  import PartnersSection from './PartnersSection.svelte';
  import staticAssetUrl from '@/lib/util/staticAssetUrl';
  import { coreTeamProfiles, type ProfileData } from '../_static/profiles';

  const contributorProfiles: ProfileData[] = [
    {
      name: 'Michiel',
      role: 'Developer',
      imageSrc: michielImg,
      introHtml: 'The original coder. Without him, WTMG wouldn’t exist.'
    },
    {
      name: 'Marie',
      role: 'Designer',
      imageSrc: marieImg,
      introHtml: 'The genius designer. She made WTMG so pretty.'
    },
    {
      name: 'Ismaila',
      role: 'Developer',
      imageSrc: ismailaImg,
      introHtml: 'Ismaila is the brain behind the filters on the map.'
    },
    {
      name: 'Brent',
      role: 'Developer',
      imageSrc: brentImg,
      introHtml: 'Brent coded our first landing page.'
    }
  ];
</script>

<PaddedSection>
  <MarketingBlock centered>
    <h1>Here we are!</h1>
    <p>
      So, who’s behind WTMG? We’re a small team of five slow travel enthusiasts and we want to help
      others embark on their slow travel adventures too! Fun fact: all of us are both WTMG hosts and
      travellers
    </p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection vertical>
  <div class="profiles">
    {#each coreTeamProfiles as item}
      <Profile {...item}>
        {@html item.introHtml}
      </Profile>
    {/each}
  </div>
</PaddedSection>
<OurStorySection />
<ContributeSection />
<PaddedSection vertical backgroundColor="var(--color-beige-light)">
  <div class="contributors-header">
    <Heading caption="Contributors">
      Last but not least, we want to thank these amazing people
    </Heading>
    <Text
      >Without these amazing people, Welcome To My Garden wouldn’t exist. They stood at the cradle
      of the platform and believed in it from the start!
    </Text>
  </div>
  <div class="profiles">
    {#each contributorProfiles as item}
      <Profile {...item}>
        {@html item.introHtml}
      </Profile>
    {/each}
  </div>
</PaddedSection>
<PartnersSection />

<style>
  div.profiles {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6rem;
  }

  div.profiles :global(.profile) {
    flex-basis: 25rem;
  }

  div.contributors-header {
    text-align: center;
  }
</style>
