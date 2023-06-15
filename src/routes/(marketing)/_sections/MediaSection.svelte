<script>
  import velotourImg from '$lib/assets/velotour-group.jpeg?run&width=1280';
  export let decoration = false;
  import Img from '@zerodevx/svelte-img';
  import sun from '$lib/images/sun.png?run&width=500&lqip=0';
  import flowerRed from '$lib/images/flower-red.png?run&width=500&lqip=0';
</script>

<!-- TODO: auto scroll to this id? No SSR, so it won't be immediately there -->
<div class="wrapper" id="media">
  <div class="heading">
    <slot name="heading" />
  </div>
  <div class="text">
    <slot name="text" />
  </div>
  <div class="media" class:decoration>
    <Img src={velotourImg} />
    {#if decoration}
      <div class="decoration-frame">
        <Img src={sun} alt="" />
        <Img src={flowerRed} alt="" />
      </div>
    {/if}
  </div>
</div>

<style>
  .wrapper {
    width: 100%;
    /* display: flex; */
    display: grid;

    /* flex-direction: row;
    align-items: center; */
    column-gap: 3rem;
    row-gap: 0.5rem;
    grid-template-columns: 1.2fr 1fr;
    grid-template-rows: auto auto;
  }

  .heading {
    grid-row: 1;
    grid-column: 1 / 3;
  }

  .text {
    grid-column: 1;
    grid-row: 2;
    flex: 1;
    max-width: 550px;
    margin: 2rem 0;
  }

  .media {
    grid-column: 2;
    grid-row: 2 / span 1;
    align-self: start;
    margin-top: 1.5rem;
    position: relative;
  }

  /* All images are relative to picture sizing */
  .media :global(picture img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .decoration-frame > :global(picture) {
    position: absolute;
  }
  /* sun decoartion */
  .decoration-frame > :global(picture:first-child) {
    top: -5rem;
    right: -2rem;
    width: 10rem;
  }

  /* flower decoration */
  .decoration-frame > :global(picture:last-child) {
    left: -2rem;
    bottom: -2rem;
    width: 7rem;
  }

  /* main image */
  .media > :global(picture > img) {
    border-radius: 20px;
    overflow: hidden;
    aspect-ratio: 16/10;
  }
  .heading :global(h2) {
    margin-bottom: 0;
  }

  @media only screen and (max-width: 1050px) {
    .wrapper {
      /* Change to to a simple row grid */
      grid-template-rows: auto auto auto;
      grid-template-columns: 100%;
      row-gap: 1rem;
      justify-items: center;
    }

    .heading {
      grid-row: 1;
      grid-column: 1;
    }

    .heading :global(h2) {
      margin-bottom: 2rem;
    }

    .media {
      grid-row: 2;
      grid-column: 1;
      width: 100%;
      align-self: center;
      margin-top: 0;
      max-width: 700px;
    }
    .text {
      grid-row: 3;
      width: 100%;
    }

    .decoration-frame {
      display: none;
    }
  }
</style>
