<script lang="ts">
  import { _ } from 'svelte-i18n';

  import { LabeledCheckbox, MultiActionLabel, Button, Icon } from '$lib/components/UI';
  import { cyclistIcon, hikerIcon, routesIcon } from '$lib/images/icons';
  import { fileDataLayers } from '$lib/stores/file';
  import { routeTweaks } from '$lib/stores/routeTweaks';
  import { colorForRoute } from '$lib/util/map/routeStyle';
  import { cleanName } from '$lib/util/slugify';
  import { onDestroy } from 'svelte';
  import { deleteTrail, toggleTrailVisibility } from '$lib/api/trail';

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

  let localFileDataLayers = $state($fileDataLayers);
  const fileDataLayersUnsubscribe = fileDataLayers.subscribe((value) => {
    localFileDataLayers = value;
  });
  onDestroy(fileDataLayersUnsubscribe);
</script>

<div class="static-layers" class:in-modal={inModal}>
  <LabeledCheckbox
    name="hiking"
    icon={hikerIcon}
    label={$_('map.trails.hiking')}
    bind:checked={showHiking}
  />
  <LabeledCheckbox
    name="cycling"
    icon={cyclistIcon}
    label={$_('map.trails.cycling')}
    bind:checked={showCycling}
  />
</div>

<div class="data-layers" class:in-modal={inModal}>
  {#each localFileDataLayers as layer, index}
    <div class="trail-row">
      <div class="trail-label">
        <MultiActionLabel
          icon={routesIcon}
          name={layer.id}
          label={cleanName(layer.originalFileName)}
          checked={layer.visible}
          onchange={() => toggleTrailVisibility(layer.id)}
          onsecondary={() => deleteTrail(layer.id)}
        />
      </div>
      <!-- Colour indicator matching the route's colour on the map -->
      <span
        class="trail-color"
        class:dimmed={!layer.visible}
        style:background={colorForRoute(index, $routeTweaks.useMultipleColors)}
        title="Route colour on the map"
      ></span>
    </div>
  {/each}
</div>

<div class="layers-and-tools-button" class:in-modal={inModal}>
  <Button preventing {onclick} inverse={!inModal} xxsmall={!inModal} small={inModal}>
    <span class="button-text-container">
      <span class="button-icon">
        <Icon icon={routesIcon} whiteStroke={inModal} />
      </span>
      <span class="button-text">{$_('map.routes.upload-route')}</span>
    </span>
  </Button>
</div>

<style>
  .trail-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
  }

  .trail-label {
    flex: 1;
    min-width: 0;
  }

  /* Vertical colour bar matching the route's colour on the map. */
  .trail-color {
    flex-shrink: 0;
    width: 0.4rem;
    align-self: stretch;
    min-height: 2rem;
    border-radius: 0.2rem;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  }

  .trail-color.dimmed {
    opacity: 0.3;
  }

  .button-text-container {
    display: inline-flex;
    align-items: center;
  }

  .button-icon {
    width: 1.4rem;
    height: 1.4rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }

  .layers-and-tools-button {
    margin-top: 0.5rem;
    text-align: center;
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

  .layers-and-tools-button.in-modal .button-icon {
    width: 1.6rem;
    height: 1.6rem;
    margin: 0 1rem 0 0;
  }
</style>
