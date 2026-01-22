<script lang="ts">
  import { _ } from 'svelte-i18n';
  import MarketingBlock from '$lib/components/Marketing/MarketingBlock.svelte';

  const michielImg = staticAssetUrl('/profile-pictures/michiel.png?v=2');
  const wardImg = staticAssetUrl('/profile-pictures/ward.png');
  const marieImg = staticAssetUrl('/profile-pictures/marie.jpg');
  const ismailaImg = staticAssetUrl('/profile-pictures/ismaila.jpg');
  const brentImg = staticAssetUrl('/profile-pictures/brent.jpg');
  const jannekeImg = staticAssetUrl('/profile-pictures/janneke.png');

  import OurStorySection from './OurStorySection.svelte';
  import Text from '$lib/components/UI/Text.svelte';
  import PartnersSection from './PartnersSection.svelte';
  import staticAssetUrl from '$lib/util/staticAssetUrl';
  import {
    coreTeamProfiles as coreTeamProfilesStatic,
    type ProfileData
  } from '$lib/components/Marketing/static/profiles';
  import MarketingStyleWrapper from '$lib/components/Marketing/MarketingStyleWrapper.svelte';
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import Profile from '$lib/components/Marketing/Profile.svelte';
  import Heading from '$lib/components/Marketing/Heading.svelte';

  // https://stackoverflow.com/a/67830849
  let contributorProfiles: ProfileData[] = $derived([
    {
      name: 'Michiel',
      role: $_('about-us.dev'),
      imageSrc: michielImg,
      introHtml: $_('about-us.michiel')
    },
    {
      name: 'Ward',
      role: $_('about-us.dev'),
      imageSrc: wardImg,
      introHtml: $_('about-us.ward')
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
    },
    {
      name: 'Janneke',
      role: $_('about-us.communications'),
      imageSrc: jannekeImg,
      introHtml: $_('about-us.janneke')
    }
  ]);
  

  // https://stackoverflow.com/a/67830849
  // coreTeamProfiles is structured like this for the sake of i18n
  let coreTeamProfiles: { [name: string]: ProfileData } = $derived({
    dries: {
      ...coreTeamProfilesStatic.dries,
      role: $_('about-us.co-founder'),
      introHtml: $_('about-us.dries')
    },
    manon: {
      ...coreTeamProfilesStatic.manon,
      role: $_('about-us.co-founder'),
      introHtml: $_('about-us.manon')
    },
    thor: {
      ...coreTeamProfilesStatic.thor,
      role: $_('about-us.co-founder'),
      introHtml: $_('about-us.thor')
    }
  });
  
</script>

<svelte:head>
  <title>{$_('generics.about-us')} | {$_('generics.wtmg.explicit')}</title>
</svelte:head>

<MarketingStyleWrapper>
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
      {#each Object.values(coreTeamProfiles) as { introHtml, ...rest }}
        <Profile {...rest}>
          {@html introHtml}
        </Profile>
      {/each}
    </div>
  </PaddedSection>
  <OurStorySection />
  <PaddedSection vertical>
    <div class="contributors-header">
      <Heading caption={$_('about-us.contributors')}>
        {$_('about-us.amazing-people')}
      </Heading>
      <Text>
        {@html $_('about-us.cradle')}
      </Text>
    </div>
    <div class="profiles contributors">
      {#each contributorProfiles as { introHtml, ...rest }}
        <Profile {...rest}>
          {@html introHtml}
        </Profile>
      {/each}
    </div>
  </PaddedSection>
  <PartnersSection />
</MarketingStyleWrapper>

<style>
  div.profiles {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6rem;
  }

  .profiles.contributors {
    gap: 1rem;
    max-width: 900px;
    margin: auto;
  }

  .profiles.contributors :global(.text) {
    max-width: 20rem;
  }

  div.profiles :global(.profile) {
    flex-basis: 25rem;
  }

  div.contributors-header {
    text-align: center;
    margin-bottom: var(--spacing-medium);
  }
  div.contributors-header :global(p) {
    max-width: 800px;
    margin: auto;
  }
</style>
