<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import TransportTools from '$lib/components/LayersAndTools/TransportTools.svelte';
  import { MOBILE_BREAKPOINT } from '$lib/constants';

  interface Props {
    show?: boolean;
    showTransport: boolean;
  }

  let { show = $bindable(false), showTransport = $bindable() }: Props = $props();

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
      <h2 class="title-modal">{$_('map.railway.title-modal')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="BodySection">
      <hr />
      <div class="modal-content">
        <TransportTools bind:showTransport />
      </div>
    </div>
  {/snippet}
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
