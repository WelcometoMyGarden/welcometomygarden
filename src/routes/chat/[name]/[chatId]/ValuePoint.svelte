<script lang="ts">
  /**
   * Link to local asset
   */
  import Img from '@zerodevx/svelte-img';
  export let imgPath: Object[] | undefined;
  export let titleBoldPart: string;
  export let titleRest: string;
</script>

<li class="value-prop">
  <div class="title">
    <span class="checkmark">✅</span><span class="title-bold">{titleBoldPart}</span>{titleRest &&
      ` ${titleRest}`}
    <h4><slot /></h4>
  </div>
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

  .title {
    line-height: 1.5;
  }

  span.checkmark {
    display: inline-block;
    margin-right: 1rem;
  }

  span.title-bold {
    font-weight: 600;
  }

  .value-prop :global(picture),
  .value-prop :global(img) {
    width: 100%;
    height: auto;
  }
</style>
