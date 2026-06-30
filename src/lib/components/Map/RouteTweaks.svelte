<script lang="ts">
  /**
   * Temporary prototype overlay for experimenting with how uploaded routes are displayed.
   *
   * NOTE: this is a one-off, self-contained tweaks panel. It can be removed together with
   * `$lib/stores/routeTweaks` and the related handling in `FileTrails.svelte`.
   */
  import { routeTweaks, currentMapZoom, effectiveKm } from '$lib/stores/routeTweaks';
  import { ROUTE_COLORS, DEFAULT_ZOOM_INTERVAL_CONFIG } from '$lib/util/map/routeStyle';
  import { Switch, Modal } from '$lib/components/UI';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon } from '$lib/images/icons';

  let showIntervalModal = $state(false);

  const toggle = (key: 'useMultipleColors' | 'showKmMarkers' | 'showStartEndMarkers') =>
    routeTweaks.update((t) => ({ ...t, [key]: !t[key] }));

  const setPanelOpen = (panelOpen: boolean) => routeTweaks.update((t) => ({ ...t, panelOpen }));

  const onConfigInput = (e: Event) =>
    routeTweaks.update((t) => ({
      ...t,
      zoomIntervalConfig: (e.currentTarget as HTMLTextAreaElement).value
    }));

  const resetConfig = () =>
    routeTweaks.update((t) => ({ ...t, zoomIntervalConfig: DEFAULT_ZOOM_INTERVAL_CONFIG }));

  let zoomText = $derived($currentMapZoom != null ? $currentMapZoom.toFixed(1) : '—');
  let intervalText = $derived(
    !$routeTweaks.showKmMarkers
      ? 'off'
      : !$effectiveKm
        ? 'hidden'
        : $effectiveKm.opacity < 1
          ? `${$effectiveKm.interval} km (fading)`
          : `${$effectiveKm.interval} km`
  );
</script>

{#if $routeTweaks.panelOpen}
  <section class="route-tweaks" aria-label="Route display tweaks">
    <header>
      <h3>Route tweaks <span class="badge">prototype</span></h3>
      <button class="close" aria-label="Close tweaks panel" onclick={() => setPanelOpen(false)}>
        <Icon icon={crossIcon} />
      </button>
    </header>

    <div class="row">
      <span class="label">Distinguish routes by colour</span>
      <Switch
        checked={$routeTweaks.useMultipleColors}
        ariaLabel="Toggle multiple route colours"
        onToggle={() => toggle('useMultipleColors')}
      />
    </div>

    {#if $routeTweaks.useMultipleColors}
      <div class="legend">
        {#each ROUTE_COLORS as color}
          <span class="swatch" style:background={color}></span>
        {/each}
      </div>
    {/if}

    <div class="row">
      <span class="label">Show km markers</span>
      <Switch
        checked={$routeTweaks.showKmMarkers}
        ariaLabel="Toggle kilometre markers"
        onToggle={() => toggle('showKmMarkers')}
      />
    </div>

    <div class="readouts">
      <div><span class="muted">Zoom level</span> <strong>{zoomText}</strong></div>
      <div><span class="muted">Interval</span> <strong>{intervalText}</strong></div>
    </div>
    <button class="link-button" onclick={() => (showIntervalModal = true)}>
      Edit zoom → interval rules…
    </button>

    <div class="row">
      <span class="label">Show start/end markers</span>
      <Switch
        checked={$routeTweaks.showStartEndMarkers}
        ariaLabel="Toggle start and end markers"
        onToggle={() => toggle('showStartEndMarkers')}
      />
    </div>
  </section>
{:else}
  <button class="route-tweaks-reopen" onclick={() => setPanelOpen(true)}> Route tweaks </button>
{/if}

<Modal
  bind:show={showIntervalModal}
  maxWidth="42rem"
  center
  closeButton
  ariaLabel="Edit zoom to interval rules"
>
  {#snippet body()}
    <div class="config-modal">
      <h3>Zoom → km interval rules</h3>
      <p class="help">
        One rule per line: <code>&lt;min&gt;-&lt;max&gt;,&lt;intervalKm&gt;</code>. Omit
        <code>max</code> for an open upper bound. Floats allowed. Lines apply at zoom in
        <code>[min, max)</code>. Below the lowest rule the markers fade out.
      </p>
      <p class="help example">
        e.g. <code>11-,1</code> = 1&nbsp;km from zoom 11; <code>7-8,10</code> = 10&nbsp;km between zoom
        7 and 8.
      </p>
      <textarea
        class="config-input"
        rows="6"
        spellcheck="false"
        value={$routeTweaks.zoomIntervalConfig}
        oninput={onConfigInput}
      ></textarea>
      <div class="config-status">
        Current zoom <strong>{zoomText}</strong> → interval <strong>{intervalText}</strong>
      </div>
    </div>
  {/snippet}
  {#snippet controls()}
    <button class="reset-button" onclick={resetConfig}>Reset to default</button>
  {/snippet}
</Modal>

<style>
  .route-tweaks {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 4.5rem);
    right: 0.8rem;
    z-index: 20;
    width: 24rem;
    max-width: calc(100vw - 1.6rem);
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0.6rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    padding: 1rem 1.2rem 1.2rem;
    font-size: 1.4rem;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }

  h3 {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .badge {
    font-size: 1rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #fff;
    background: var(--color-orange, #e65100);
    border-radius: 0.3rem;
    padding: 0.1rem 0.4rem;
  }

  .close {
    background: none;
    border: none;
    cursor: pointer;
    width: 2rem;
    height: 2rem;
    padding: 0.2rem;
    flex-shrink: 0;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .label {
    line-height: 1.3;
  }

  .readouts {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.4rem 0 0.2rem;
  }

  .readouts .muted {
    color: var(--color-text-light, #777);
  }

  .link-button {
    background: none;
    border: none;
    padding: 0.2rem 0 0.6rem;
    color: var(--color-highlight-blue, #1565c0);
    text-decoration: underline;
    cursor: pointer;
    font-size: 1.3rem;
  }

  .legend {
    display: flex;
    gap: 0.4rem;
    padding: 0 0 0.4rem;
  }

  .swatch {
    width: 2.2rem;
    height: 0.8rem;
    border-radius: 0.4rem;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  }

  .route-tweaks-reopen {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 4.5rem);
    right: 0.8rem;
    z-index: 20;
    background: rgba(255, 255, 255, 0.95);
    border: none;
    border-radius: 0.6rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    padding: 0.6rem 1rem;
    font-size: 1.3rem;
    font-weight: 600;
    cursor: pointer;
  }

  .config-modal h3 {
    font-size: 1.7rem;
    margin: 0 0 0.8rem;
  }

  .config-modal .help {
    font-size: 1.3rem;
    line-height: 1.4;
    margin: 0 0 0.6rem;
    color: var(--color-text, #333);
  }

  .config-modal .example {
    color: var(--color-text-light, #777);
  }

  .config-modal code {
    background: var(--color-gray-fa, #f2f2f2);
    border-radius: 0.3rem;
    padding: 0.05rem 0.3rem;
    font-family: monospace;
  }

  .config-input {
    width: 100%;
    box-sizing: border-box;
    font-family: monospace;
    font-size: 1.4rem;
    line-height: 1.5;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--color-gray, #ccc);
    border-radius: 0.4rem;
    resize: vertical;
  }

  .config-status {
    margin-top: 0.8rem;
    font-size: 1.3rem;
    color: var(--color-text-light, #777);
  }

  .reset-button {
    background: none;
    border: 1px solid var(--color-gray, #ccc);
    border-radius: 0.4rem;
    padding: 0.5rem 1rem;
    cursor: pointer;
    font-size: 1.3rem;
  }
</style>
