<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import TransportTools from '$lib/components/LayersAndTools/TransportTools.svelte';

  export let show = false;
  export let showTransport: boolean;
  export let showRails: boolean;
  export let showStations: boolean;

  // MODAL
  let ariaLabelledBy = 'tent-modal-title';
  let stickToBottom = true;
  let maxWidth = 700;
</script>

<Modal bind:show maxWidth="{maxWidth}px" {stickToBottom} nopadding={stickToBottom} {ariaLabelledBy}>
  <div slot="title" class="TitleSection" id={ariaLabelledBy}>
    <h2 class="title-modal">{$_('map.railway.title-modal')}</h2>
  </div>
  <div slot="body" class="BodySection">
    <hr />
    <div class="modal-content">
      <TransportTools bind:showRails bind:showStations bind:showTransport on:click />
    </div>
  </div>
</Modal>

<style>
  .TitleSection {
    width: 100%;
  }

  .title-modal {
    font-weight: 600;
    font-size: 2rem;
    text-align: center;
  }

  @media screen and (max-width: 700px) {
    .title-modal {
      font-size: initial;
    }
  }
</style>
