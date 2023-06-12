<script lang="ts">
  /**
   * Link to local asset
   */
  import Img from '@zerodevx/svelte-img';
  export let imgPath: Object[] | undefined;
  export let title: string;
  export let border = false;
</script>

<li class="value-prop" class:border>
  <p class="title">
    <span class="checkmark">✅</span>
    <span>{@html title}</span>
  </p>
  <!-- TODO: define sizes & alt-->
  {#if imgPath}
    <Img src={imgPath} sizes="" />
  {/if}
</li>

<style>
  .value-prop {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    width: 100%;
  }

  .border {
    overflow: hidden;
    border: 1px solid var(--color-green);
    border-radius: 20px;
    /* expand into the box (assumign a grid parent) */
    align-self: stretch;
  }

  .border > :global(picture) {
    flex-grow: 1;
  }
  .border > :global(picture > img) {
    height: 100%;
    object-fit: cover;
  }

  .border > p {
    padding: 1.5rem 1.5rem 0 1.5rem;
  }

  .title {
    line-height: 1.5;
  }

  span.checkmark {
    display: inline-block;
    margin-right: 1rem;
  }

  p.title :global(strong) {
    font-weight: 600;
  }

  .value-prop :global(picture),
  .value-prop :global(img) {
    width: 100%;
    height: auto;
  }
</style>
