<script context="module" lang="ts">
  export type Slide = {
    quote: string;
    name: string;
    // Should not include the bucket prefix
    /**
     * svelte-img image
     */
    image: unknown[] | undefined;
  };
</script>

<script lang="ts">
  import { arrowRightIcon } from '$lib/images/icons';

  import Img from '@zerodevx/svelte-img';
  import { fade } from 'svelte/transition';

  export let slides: Slide[];
  let activeSlide = 0;
  const previous = () => {
    activeSlide = (activeSlide == 0 ? slides.length : activeSlide) - 1;
  };
  const next = () => {
    activeSlide = activeSlide === slides.length - 1 ? 0 : activeSlide + 1;
  };
</script>

<div class="wrapper">
  {#each slides as { name, image, quote }, index}
    {#if activeSlide === index}
      <div class="slide" transition:fade>
        <div class="image">
          <Img src={image} alt="Image of {name}" />
        </div>
        <div class="text">
          <quote class="quote">〝{quote}〞</quote>
          <span class="name">{name}</span>
          <div class="controls">
            <button class="previous" on:click={previous}>{@html arrowRightIcon}</button>
            <button class="next" on:click={next}>{@html arrowRightIcon}</button>
          </div>
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .wrapper {
    background-color: var(--color-green-light);
    border-radius: var(--marketing-block-border-radius);
    /* Clips the parts of the image that exted out of the rounded wrapper */
    overflow: hidden;
    width: 100%;
    height: 36rem;
  }
  .slide {
    display: flex;
    flex-direction: row-reverse;
    height: 100%;
  }
  .image,
  .text {
    flex-basis: 50%;
  }

  .quote {
    text-align: center;
  }

  .text {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    align-items: center;
    justify-content: center;
    padding: 8rem;

    font-family: 'Montserrat';
    font-style: normal;
    font-weight: 600;
    font-size: 1.8rem;
    line-height: 148%;
  }

  .name {
    font-size: 1.6rem;
    font-weight: normal;
  }

  .image :global(img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    width: 9.5rem;
  }

  /* Fixes a problem in Safari where the icons are not shown */
  .controls > button :global(svg) {
    height: 100%;
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 4rem;
    width: 4rem;
    padding: 1rem;
    border-radius: 50%;
    background-color: var(--color-green);
    border: 0;
  }

  button:hover {
    background-color: var(--color-orange-light-2);
    transition: all 0.4s;
  }

  .controls :global(button path) {
    fill: white;
  }

  .previous :global(svg) {
    transform: rotate(180deg);
  }

  @media only screen and (max-width: 900px) {
    .wrapper {
      height: unset;
    }
    .slide {
      height: unset;
      flex-direction: column;
    }

    .image {
      max-height: calc(max(50vw, 240px));
      aspect-ratio: 16/9;
    }

    .text {
      position: relative;
      padding: 10vw;
      max-width: 600px;
      margin: auto;
    }
    .controls {
      position: absolute;
      width: 100%;
      left: 0;
      top: -2rem;
      padding: 0 3rem;
    }
  }

  @media only screen and (max-width: 700px) {
    .wrapper {
      border-radius: 0;
    }
  }
</style>
