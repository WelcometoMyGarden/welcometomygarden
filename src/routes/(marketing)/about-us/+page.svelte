<script lang="ts">
  import { _ } from 'svelte-i18n';
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
      role: $_('about-us.dev'),
      imageSrc: michielImg,
      introHtml: $_('about-us.michiel')
    },
    {
      name: 'Marie',
      role: $_('about-us.designer'),
      imageSrc: marieImg,
      introHtml: $_('about-us.marie')
    },
    {
      name: 'Ismaila',
      role: $_('about-us.dev'),
      imageSrc: ismailaImg,
      introHtml: $_('about-us.ismaila')
    },
    {
      name: 'Brent',
      role: $_('about-us.dev'),
      imageSrc: brentImg,
      introHtml: $_('about-us.brent')
    }
  ];
</script>

<PaddedSection>
  <MarketingBlock centered>
    <h1>{$_('about-us.here-we-are')}</h1>
    <p>
      {$_('about-us.who-behind')}
    </p>
  </MarketingBlock>
</PaddedSection>
<PaddedSection>
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
    <Heading caption={$_('about-us.contributors')}>
      {$_('about-us.amazing-people')}
    </Heading>
    <Text>
      {$_('about-us.cradle')}
    </Text>
  </div>
  <div class="profiles contributors">
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

  .profiles.contributors {
    gap: 1rem;
  }

  .profiles.contributors :global(.text) {
    max-width: 20rem;
  }

  div.profiles :global(.profile) {
    flex-basis: 25rem;
  }

  div.contributors-header {
    text-align: center;
  }
</style>
