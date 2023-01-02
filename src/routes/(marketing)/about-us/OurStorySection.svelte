<script>
  import staticAssetUrl from '$lib/util/staticAssetUrl';
  import { _ } from 'svelte-i18n';
  import PaddedSection from '../_components/PaddedSection.svelte';
  const manonDriesInJapan = staticAssetUrl('/our-story/manon-dries-in-japan.jpg');
  const hosts = staticAssetUrl('/our-story/hosts.jpg');
</script>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical>
  <div class="wrapper">
    <img class="our-story" src={manonDriesInJapan} alt="Manon & Dries with bikes in Japan" />
    <h2 class="our-story">{$_('about-us.our-story-title')}</h2>
    <div class="text our-story">
      {@html $_('about-us.our-story-description')}
    </div>
    <h2 class="bigger-picture">{$_('about-us.bigger-picture-title')}</h2>
    <div class="text bigger-picture">
      {@html $_('about-us.bigger-picture-description')}
    </div>
    <img class="bigger-picture" src={hosts} alt="Two hosts holding a WTMG sign." />
  </div>
</PaddedSection>

<style>
  .wrapper {
    max-width: 100rem;
    margin: auto;
    display: grid;
    grid-template-rows: auto [heading] auto [textimg] auto [heading2] auto [textimg2];
    grid-template-columns: repeat(5, 1fr);
    column-gap: 3rem;
  }

  h2.our-story {
    grid-row: 1;
    grid-column: 3 / span 3;
  }

  .text.our-story {
    grid-row: 2;
    grid-column: 3 / span 3;
  }

  img.our-story {
    grid-row: 2;
    grid-column: 1 / span 2;
  }

  h2.bigger-picture {
    grid-row: 3;
    grid-column: 1 / span 3;
  }

  .text.bigger-picture {
    grid-row: 4;
    grid-column: 1 / span 3;
  }

  img.bigger-picture {
    grid-row: 4;
    grid-column: 4 / span 2;
  }

  img {
    width: 90%;
    max-width: 44rem;
    border-radius: 2rem;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    align-self: center;
    justify-self: center;
  }

  .text :global(ul) {
    list-style-type: disc;
    list-style-position: inside;
  }

  /* TODO: should be li > span, might break? */
  .text :global(li span) {
    padding-left: 0.1rem;
  }

  @media only screen and (max-width: 900px) {
    .wrapper {
      grid-template-columns: auto;
      grid-template-rows: auto [h1] auto [img1] auto [txt1] auto [h2] auto [img2] auto [txt2];
    }

    .wrapper > .our-story,
    .wrapper > .bigger-picture {
      grid-column: 1;
    }

    h2.our-story {
      grid-row: 1;
    }

    img.our-story {
      grid-row: 2;
    }

    .text.our-story {
      grid-row: 3;
    }

    h2.bigger-picture {
      grid-row: 4;
    }

    img.bigger-picture {
      grid-row: 5;
    }

    .text.bigger-picture {
      grid-row: 6;
    }

    img {
      aspect-ratio: 4 / 3;
      border-radius: 0;
      max-width: unset;
      width: 100%;
      align-self: stretch;
      padding: 0;
      object-fit: cover;
      margin-bottom: var(--spacing-medium);
    }
  }
</style>
