<script lang="ts">
  import MarketingBlock from '@/routes/(marketing)/_components/MarketingBlock.svelte';
  import type { ComponentProps } from 'svelte';
  import PaddedSection from '../_components/PaddedSection.svelte';
  import Profile from '../_components/Profile.svelte';

  import driesImg from '$lib/images/profile-pictures/dries.png';
  import manonImg from '$lib/images/profile-pictures/manon.png';
  import thorImg from '$lib/images/profile-pictures/thor.png';
  import wardImg from '$lib/images/profile-pictures/ward.png';
  import jannekeImg from '$lib/images/profile-pictures/janneke.png';
  import michielImg from '$lib/images/profile-pictures/michiel.png';
  import marieImg from '$lib/images/profile-pictures/marie.jpg';
  import ismailaImg from '$lib/images/profile-pictures/ismaila.jpg';
  import brentImg from '$lib/images/profile-pictures/brent.jpg';

  import OurStorySection from './OurStorySection.svelte';
  import ContributeSection from './ContributeSection.svelte';
  import Heading from '../_components/Heading.svelte';
  import Text from '$lib/components/UI/Text.svelte';
  import PartnersSection from './PartnersSection.svelte';

  type ProfileData = ComponentProps<Profile> & { introHtml: string };
  const profiles: ProfileData[] = [
    {
      name: 'Dries',
      role: 'Co-founder',
      imageSrc: driesImg,
      introHtml:
        "Dries is the one who came up with WTMG. He bought his first tour bike when he was only 18, and biked from Brussels to Tokyo with Manon in 2019. His love for open data and open source led him to work for Open Knowledge Belgium for a few years, which is also where he met Ward and Thor. He's leading the WTMG team and his enthusiasm is utterly contagious!"
    },
    {
      name: 'Manon',
      role: 'Co-founder',
      imageSrc: manonImg,
      introHtml:
        'Manon is a true multipotentialite and has a solution for everything. She ran a marathon twice, cycled from Brussels to Tokyo with Dries, and made a beautiful film about it: <a href="https://womendontcycle.com/">‘Women Don’t Cycle’</a>. She\'s the only one on the team who studied tourism. The fact that she\'s fluent in four languages and feels very comfortable in front of a camera makes her our unofficial spokesperson!'
    },
    {
      name: 'Thor',
      role: 'Co-founder',
      imageSrc: thorImg,
      introHtml:
        'Thor is the genius technologist any project needs. He participated in Open Summer of Code twice, where he met Dries in 2017. In the same year, he cycled from Leuven to Helsinki. He is now a WTMG host there! Not only is he a fantastic developer, he’s a great designer as well. He loves cooking, coding and reading long intriguing articles!'
    },
    {
      name: 'Ward',
      role: 'Developer',
      imageSrc: wardImg,
      introHtml:
        'Ward is the most enthusiastic developer the world has ever seen! He went on a trip using WTMG only two days after he’d discovered it. Coincidentally, a journalist who wanted to write about WTMG took his picture and so he made it into a newspaper! He’s so eager to bring code to the world that we call him the “Push the button guy” on our team!'
    },
    {
      name: 'Janneke',
      role: 'Communications',
      imageSrc: jannekeImg,
      introHtml:
        'Janneke loves words and is absolutely amazing with them. As soon as she read about WTMG, she immediately suggested there should be a Facebook page and has been taking care of our communication ever since! She is head over heels in love with Romania; she wrote a guidebook about it, bought a house there, and founded Roamaniac.'
    }
  ];

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

<PaddedSection
  ><MarketingBlock backgroundColor="var(--color-green-light)" centered>
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
    {#each profiles as item}
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
<PaddedSection>
  <PartnersSection />
</PaddedSection>

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
