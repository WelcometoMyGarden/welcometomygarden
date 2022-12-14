<script context="module" lang="ts">
  export type Slide = {
    quote: string;
    name: string;
    // Should not include the bucket prefix
    imagePath: string;
  };
</script>

<script lang="ts">
  import staticAssetUrl from '@/lib/util/staticAssetUrl';
  import { fade } from 'svelte/transition';

  export let slides: Slide[];
  let activeSlide = 0;
  const previous = () => {activeSlide = (activeSlide == 0 ? slides.length : activeSlide) - 1 }
  const next = () => { activeSlide = (activeSlide === slides.length - 1) ? 0 : activeSlide + 1 }
</script>

<div class="testimonial-wrapper">
  {#each slides as { name, imagePath, quote }, index}
    {#if activeSlide === index}
      <div class="slide" transition:fade>
        <div class="image">
          <img src={staticAssetUrl(imagePath)} alt="Image of {name}" />
        </div>
        <div class="text">
          <quote class="quote">〝{quote}〞</quote>
          <span class="name">{name}</span>
          <div class="controls">
            <button class="previous" on:click={previous}>←</button>
            <button class="next" on:click={next}>→</button>
          </div>
        </div>
      </div>
    {/if}
  {/each}
</div>

<style>
  .testimonial-wrapper {
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

  quote {
    text-align: center;
  }

  div.text {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    align-items: center;
    justify-content: center;
    padding: 8rem;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
</style>
