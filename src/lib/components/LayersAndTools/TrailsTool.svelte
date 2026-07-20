<script lang="ts">
  import { _ } from 'svelte-i18n';

  import { LabeledCheckbox, MultiActionLabel, Button, Icon } from '$lib/components/UI';
  import { cyclistIcon, hikerIcon, routesIcon } from '$lib/images/icons';
  import { fileDataLayers } from '$lib/stores/file';
  import { colorForRoute } from '$lib/util/map/util';
  import { cleanName } from '$lib/util/slugify';
  import { deleteTrail } from '$lib/api/trail';

  interface Props {
    showHiking: boolean;
    showCycling: boolean;
    onclick: (e: MouseEvent) => void;
    /**
     * Whether this tool is rendered inside a mobile MapToolModal (as opposed to
     * the desktop LayersAndTools panel). In the modal the controls are
     * left-aligned and the upload action uses a standard-size button.
     */
    inModal?: boolean;
  }

  let {
    showHiking = $bindable(),
    showCycling = $bindable(),
    onclick,
    inModal = false
  }: Props = $props();
</script>

<div class="static-layers" class:in-modal={inModal}>
  <LabeledCheckbox
    name="hiking"
    icon={hikerIcon}
    label={$_('map.trails.hiking')}
    bind:checked={showHiking}
    hoverStyle
  />
  <LabeledCheckbox
    name="cycling"
    icon={cyclistIcon}
    label={$_('map.trails.cycling')}
    bind:checked={showCycling}
    hoverStyle
  />
</div>

<div class="data-layers" class:in-modal={inModal}>
  {#each $fileDataLayers as layer, index (layer.id)}
    <MultiActionLabel
      icon={routesIcon}
      name={layer.id}
      label={cleanName(layer.originalFileName)}
      bind:checked={layer.visible}
      onsecondary={() => deleteTrail(layer.id)}
    >
      {#snippet leading()}
        <!-- Colour indicator matching the route's colour on the map. It's rendered inside
             LabelWithIcon's <label>, so clicking it toggles visibility just like the route
             name (no need for its own `for` — a nested <label> would be invalid anyway). -->
        <span
          class="trail-color"
          class:dimmed={!layer.visible}
          style:background={colorForRoute(index)}
          title="Route colour on the map"
          aria-hidden="true"
        ></span>
      {/snippet}
    </MultiActionLabel>
  {/each}
</div>

<div class="layers-and-tools-button" class:in-modal={inModal}>
  <Button preventing oneline {onclick} inverse={!inModal} xxsmall={!inModal} small={inModal}>
    <Icon class="route-icon" icon={routesIcon} whiteStroke={inModal} />
    {$_('map.routes.upload-route')}
  </Button>
</div>

<style>
  /* Vertical colour bar matching the route's colour on the map, shown between the
     checkbox and the route name. Kept shorter than the row so there's a gap between
     consecutive bars. */
  .trail-color {
    flex-shrink: 0;
    width: 0.7rem;
    height: 1.4rem;
    margin: 0 0.7rem 0 0.6rem;
    border-radius: 0.25rem;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
    cursor: pointer;
  }

  .trail-color.dimmed {
    opacity: 0.3;
  }

  .layers-and-tools-button {
    text-align: center;
  }

  .layers-and-tools-button :global(.route-icon) {
    width: 1.4rem;
    height: 1.4rem;
    margin: 0 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .layers-and-tools-button :global(.btn-text) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .layers-and-tools-button:not(.in-modal) {
    margin-top: 0.5rem;
  }

  .layers-and-tools-button:not(.in-modal) :global(.button) {
    font-size: unset;
    padding: 0.4rem;
  }
  /* Inside the mobile MapToolModal: left-align the checkboxes (matching the
     other map tool modals) and give the upload button room to breathe. */
  .static-layers.in-modal,
  .data-layers.in-modal {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .layers-and-tools-button.in-modal {
    margin-top: 1.5rem;
  }

  .layers-and-tools-button.in-modal :global(.route-icon) {
    width: 1.6rem;
    height: 1.6rem;
    margin: 0 1rem 0 0;
  }
</style>
