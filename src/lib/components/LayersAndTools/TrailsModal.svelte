<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import TrailsTool from '$lib/components/LayersAndTools/TrailsTool.svelte';

  export let show = false;
  export let showHiking: boolean;
  export let showCycling: boolean;

  // MODAL
  let ariaLabelledBy = 'tent-modal-title';
  let stickToBottom = true;
  let maxWidth = 700;
</script>

<Modal bind:show maxWidth="{maxWidth}px" {stickToBottom} nopadding={stickToBottom} {ariaLabelledBy}>
  <div slot="title" class="TitleSection" id={ariaLabelledBy}>
    <h2 id="Title">{$_('map.routes.title-modal')}</h2>
  </div>
  <div slot="body" class="BodySection">
    <hr />
    <div class="modal-content">
      <TrailsTool bind:showCycling bind:showHiking on:click />
    </div>
  </div>
</Modal>

<style>
  .TitleSection {
    width: 100%;
  }

  #Title {
    font-weight: 600;
    font-size: 2rem;
    text-align: center;
  }

  @media screen and (max-width: 700px) {
    #Title {
      font-size: initial;
    }
  }
</style>
