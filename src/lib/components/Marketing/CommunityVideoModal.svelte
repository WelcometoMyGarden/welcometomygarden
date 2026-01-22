<script lang="ts">
  import { Modal } from '../UI';
  import Video from './Video.svelte';
</script>

<!--
  TODO: add support in the modal for non-scrollable body content
  that vertically scales down as the window height decreases
  (until some minimum)
  -->
<Modal
  transparent={true}
  maxWidth="1100px"
  center={true}
  backgroundColor="rgb(0,0,0,0.9)"
  transitionBackground={true}
  noInnerPadding={true}
>
  {#snippet body()}
    <Video  />
  {/snippet}
</Modal>
