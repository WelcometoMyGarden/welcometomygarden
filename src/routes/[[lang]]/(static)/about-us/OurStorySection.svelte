<script>
  import PaddedSection from '$lib/components/Marketing/PaddedSection.svelte';
  import Img from '@zerodevx/svelte-img';
  import { _ } from 'svelte-i18n';
  // These images becomes 775x581 CSS pixels at most in the mobile art direction
  // In the desktop art direction, activated at 901px and higher, is 353x442
  // With zero-devx we can't easily set different image aspect ratios for art direction,
  // so we take the max-mobile (iPad) as a reference with DPR progression: 776,1552,2328
  import manonDriesInJapan from '$lib/assets/about-us/our-story/manon-dries-in-japan.jpg?w=776;1552;2328&as=run:0';
  import hosts from '$lib/assets/about-us/our-story/hosts.png?w=776;1552;2328&as=run:0';
</script>

<PaddedSection backgroundColor="var(--color-beige-light)" vertical desktopOnly>
  <div class="wrapper">
    <Img class="our-story" src={manonDriesInJapan} alt="Manon & Dries with bikes in Japan" />
    <h2 class="our-story">{$_('about-us.our-story-title')}</h2>
    <div class="text our-story">
      {@html $_('about-us.our-story-description')}
    </div>
    <h2 class="bigger-picture">{$_('about-us.bigger-picture-title')}</h2>
    <div class="text bigger-picture">
      {@html $_('about-us.bigger-picture-description')}
    </div>
    <Img class="bigger-picture" src={hosts} alt="Two hosts holding a WTMG sign." />
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

  /* This one contains the .our-story image, inconvenient
    necessity due to missing class prop of the wrapping picture element
    from @zerodevx/svelte-img */
  .wrapper :global(picture:nth-of-type(1)) {
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

  /* Similar to above, .bigger-picture*/
  .wrapper :global(picture:nth-of-type(2)) {
    grid-row: 4;
    grid-column: 4 / span 2;
  }

  .wrapper :global(picture) {
    max-width: 44rem;
    align-self: center;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .wrapper :global(picture img) {
    width: 90%;
    height: 100%;
    aspect-ratio: 4 / 5;
    object-fit: cover;
    border-radius: 2rem;
  }

  .text :global(ul) {
    list-style-type: disc;
    list-style-position: inside;
  }

  /* TODO: should be li > span, might break? */
  .text :global(li) {
    padding-left: 0.1rem;
    font-size: var(--paragraph-font-size);
  }

  @media only screen and (max-width: 900px) {
    .wrapper {
      grid-template-columns: auto;
      grid-template-rows: auto [h1] auto [img1] auto [txt1] auto [h2] auto [img2] auto [txt2];
    }

    /* > used for specificity of overriding compared to desktop styles */
    .wrapper > .our-story,
    .wrapper > .bigger-picture,
    .wrapper :global(picture:nth-of-type(1)),
    .wrapper :global(picture:nth-of-type(2)) {
      grid-column: 1;
    }

    h2.our-story {
      grid-row: 1;
    }

    .wrapper :global(picture:nth-of-type(1)) {
      grid-row: 2;
    }

    .text.our-story {
      grid-row: 3;
    }

    h2.bigger-picture {
      grid-row: 4;
    }

    .wrapper :global(picture:nth-of-type(2)) {
      grid-row: 5;
    }

    .text.bigger-picture {
      grid-row: 6;
    }

    .wrapper :global(picture) {
      max-width: unset;
      align-self: stretch;
      padding: 0;
      margin-bottom: var(--spacing-medium);
    }
    .wrapper :global(picture img) {
      aspect-ratio: 4 / 3;
      width: 100%;
      border-radius: 0;
      object-fit: cover;
    }
  }

  @media only screen and (max-width: 700px) {
    .text {
      padding: 0 var(--spacing-small);
    }

    h2 {
      text-align: center;
    }

    .wrapper :global(picture) {
      aspect-ratio: unset;
    }
  }
</style>
