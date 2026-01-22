<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { Modal } from '$lib/components/UI';
  import TrailsTool from '$lib/components/LayersAndTools/TrailsTool.svelte';
  import { MOBILE_BREAKPOINT } from '$lib/constants';

  interface Props {
    show?: boolean;
    showHiking: boolean;
    showCycling: boolean;
    onclick: (e: MouseEvent) => void;
  }

  let {
    show = $bindable(false),
    showHiking = $bindable(),
    showCycling = $bindable(),
    onclick
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
      <h2 id="Title">{$_('map.routes.title-modal')}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="BodySection">
      <hr />
      <div class="modal-content">
        <TrailsTool bind:showCycling bind:showHiking {onclick} />
      </div>
    </div>
  {/snippet}
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
