<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import GardensTools from '$lib/components/LayersAndTools/GardensTools.svelte';
  import { MOBILE_BREAKPOINT } from '$lib/constants';

  interface Props {
    show?: boolean;
    showGardens: boolean;
    showSavedGardens: boolean;
  }

  let {
    show = $bindable(false),
    showGardens = $bindable(),
    showSavedGardens = $bindable()
  }: Props = $props();

  // MODAL
  let ariaLabelledBy = 'tent-modal-title';
  let stickToBottom = true;
</script>

<Modal
  bind:show
  maxWidth="{MOBILE_BREAKPOINT}px"
  {stickToBottom}
  nopadding={stickToBottom}
  {ariaLabelledBy}
>
  {#snippet title()}
    <div class="TitleSection" id={ariaLabelledBy}>
      <h2 id="Title">{$_('map.gardens.title')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="BodySection">
      <hr />
      <div class="modal-content">
        <GardensTools bind:showGardens bind:showSavedGardens />
      </div>
    </div>
  {/snippet}
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
