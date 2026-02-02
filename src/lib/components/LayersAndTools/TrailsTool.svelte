<script lang="ts">
  import { _ } from 'svelte-i18n';

  import { LabeledCheckbox, MultiActionLabel, Button, Icon } from '$lib/components/UI';
  import { cyclistIcon, hikerIcon, routesIcon } from '$lib/images/icons';
  import { fileDataLayers } from '$lib/stores/file';
  import { cleanName } from '$lib/util/slugify';
  import { onDestroy } from 'svelte';
  import { deleteTrail, toggleTrailVisibility } from '$lib/api/trail';

  interface Props {
    showHiking: boolean;
    showCycling: boolean;
    onclick: (e: MouseEvent) => void;
  }

  let { showHiking = $bindable(), showCycling = $bindable(), onclick }: Props = $props();

  let localFileDataLayers = $state($fileDataLayers);
  const fileDataLayersUnsubscribe = fileDataLayers.subscribe((value) => {
    localFileDataLayers = value;
  });
  onDestroy(fileDataLayersUnsubscribe);
</script>

<div class="static-layers">
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

<div class="data-layers">
  {#each localFileDataLayers as layer}
    <MultiActionLabel
      icon={routesIcon}
      name={layer.id}
      label={cleanName(layer.originalFileName)}
      checked={layer.visible}
      onchange={() => toggleTrailVisibility(layer.id)}
      onsecondary={() => deleteTrail(layer.id)}
    />
  {/each}
</div>

<div class="layers-and-tools-button">
  <Button preventing inverse xxsmall {onclick}>
    <span class="button-text-container">
      <span class="button-icon">
        <Icon icon={routesIcon} />
      </span>
      <span class="button-text">{$_('map.routes.upload-route')}</span>
    </span>
  </Button>
</div>

<style>
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

  @media screen and (max-width: 700px) {
    .static-layers,
    .data-layers {
      width: 100%;
      display: flex;
      flex-direction: column;
      max-width: 370px;
      margin: auto;
    }
  }
</style>
