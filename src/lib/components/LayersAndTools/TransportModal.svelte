<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';

  export let show = false;

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
    <h2 id="Title">Trains</h2>
  </div>
  <div slot="body" class="BodySection">
    <hr />
    <div class="modal-content">
      <!-- <GardenTools bind:showGardens bind:showSavedGardens /> -->
    </div>

    <!-- <hr /> -->
  </div>
</Modal>

<style>
  .TitleSection {
    width: 100%;
  }

  #Title {
    font-weight: bold;
    font-size: 2rem;
    text-align: center;
  }

  @media screen and (max-width: 700px) {
    #Title {
      font-size: initial;
    }
  }
</style>
