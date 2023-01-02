<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import GardensTools from '@/lib/components/LayersAndTools/GardensTools.svelte';

  export let show = false;
  export let showGardens: boolean;
  export let showSavedGardens: boolean;

  // MODAL
  let ariaLabelledBy = 'tent-modal-title';
  let stickToBottom = true;
  let maxWidth = 700;
</script>

<Modal
  bind:show
  maxWidth="{maxWidth}px"
  radius
  {stickToBottom}
  nopadding={stickToBottom}
  {ariaLabelledBy}
>
  <div slot="title" class="TitleSection" id={ariaLabelledBy}>
    <h2 id="Title">{$_('map.gardens.title')}</h2>
  </div>
  <div slot="body" class="BodySection">
    <hr />
    <div class="modal-content">
      <GardensTools bind:showGardens bind:showSavedGardens />
    </div>

    <!-- <hr /> -->
  </div>
</Modal>

<style>
  .TitleSection {
    width: 100%;
  }

  /* TODO: reuse these styles, there are several modal */
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
