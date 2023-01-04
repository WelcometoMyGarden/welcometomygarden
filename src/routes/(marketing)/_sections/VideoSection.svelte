<script>
  import Video from '../_components/Video.svelte';
</script>

<!-- TODO: auto scroll to this id? No SSR, so it won't be immediately there -->
<div class="wrapper" id="video">
  <div class="heading">
    <slot name="heading" />
  </div>
  <div class="text">
    <slot name="text" />
  </div>
  <div class="video"><Video /></div>
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
    grid-template-columns: 1fr 1fr;
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
    max-width: 500px;
    margin: 2rem 0;
  }

  .video {
    grid-column: 2;
    grid-row: 2 / span 1;
    align-self: start;
    margin-top: 2rem;
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

    .video {
      grid-row: 2;
      grid-column: 1;
      width: 100%;
      align-self: center;
      margin-top: 0;
    }
    .text {
      grid-row: 3;
      width: 100%;
    }
  }
</style>
