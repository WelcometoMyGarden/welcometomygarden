<!--
  Shared bottom-sheet modal for the map's layer/tool panels (gardens, trails,
  transport). Centralises the title styling, the divider and the modal config so
  the individual *Modal.svelte components only need to provide their heading and
  their tool controls.

  The title is centered across the full width of the modal — independent of the
  close button on the right — so it lines up with the centered drag handle shown
  above it on mobile bottom sheets.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Modal } from '$lib/components/UI';
  import { MOBILE_BREAKPOINT } from '$lib/constants';

  interface Props {
    show?: boolean;
    /** The heading text shown at the top of the modal. */
    heading: string;
    /** The tool controls rendered inside the modal body. */
    children: Snippet;
  }

  let { show = $bindable(false), heading, children }: Props = $props();

  const ariaLabelledBy = 'map-tool-modal-title';
</script>

<Modal bind:show maxWidth="{MOBILE_BREAKPOINT}px" stickToBottom nopadding {ariaLabelledBy}>
  {#snippet title()}
    <div class="title-section" id={ariaLabelledBy}>
      <h2>{heading}</h2>
    </div>
  {/snippet}
  {#snippet body()}
    <div class="body-section">
      <hr />
      <div class="content">
        {@render children()}
      </div>
    </div>
  {/snippet}
</Modal>

<style>
  /*
    Fill the modal header so the centered title spans the full width. The
    padding-left matches the close button's footprint (30px, border-box) on the
    right, so the text centers over the whole modal rather than the space left of
    the button — keeping it aligned with the centered drag handle above.
  */
  .title-section {
    flex: 1;
    padding-left: 30px;
  }

  hr {
    margin: 0px 0 14px;
  }

  .title-section h2 {
    font-weight: 600;
    font-size: 2rem;
    text-align: center;
  }

  @media screen and (max-width: 700px) {
    .title-section h2 {
      font-size: initial;
    }
  }
</style>
