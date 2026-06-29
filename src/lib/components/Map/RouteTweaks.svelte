<script lang="ts">
  /**
   * Temporary prototype overlay for experimenting with how uploaded routes are displayed.
   *
   * NOTE: this is a one-off, self-contained tweaks panel. It can be removed together with
   * `$lib/stores/routeTweaks` and the related handling in `FileTrails.svelte`.
   */
  import { routeTweaks } from '$lib/stores/routeTweaks';
  import { ROUTE_COLORS } from '$lib/util/map/routeStyle';
  import { Switch } from '$lib/components/UI';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon } from '$lib/images/icons';

  const toggle = (key: 'useMultipleColors' | 'showKmMarkers' | 'showStartEndMarkers') =>
    routeTweaks.update((t) => ({ ...t, [key]: !t[key] }));

  const onIntervalInput = (e: Event) => {
    const value = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!Number.isNaN(value) && value > 0) {
      routeTweaks.update((t) => ({ ...t, kmInterval: value }));
    }
  };

  const setPanelOpen = (panelOpen: boolean) => routeTweaks.update((t) => ({ ...t, panelOpen }));
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

    <div class="row">
      <label class="label" for="km-interval">Km marker interval</label>
      <input
        id="km-interval"
        type="number"
        min="0.1"
        step="0.1"
        value={$routeTweaks.kmInterval}
        oninput={onIntervalInput}
        disabled={!$routeTweaks.showKmMarkers}
      />
    </div>

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

  input[type='number'] {
    width: 6rem;
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--color-gray, #ccc);
    border-radius: 0.4rem;
    font-size: 1.4rem;
    text-align: right;
  }

  input[type='number']:disabled {
    opacity: 0.5;
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
</style>
