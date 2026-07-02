<script lang="ts">
  /**
   * Prototype overlay for experimenting with how garden coverage is visualized on
   * /coveragegaps.
   *
   * NOTE: self-contained, removable prototype. Can be removed together with
   * `$lib/stores/coverageTweaks` and the mode handling in `CoverageHeatmapLayer.svelte`.
   */
  import { coverageTweaks, type CoverageMode } from '$lib/stores/coverageTweaks';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon } from '$lib/images/icons';

  const MODES: { value: CoverageMode; label: string; description: string }[] = [
    {
      value: 'status-quo',
      label: 'Green → red',
      description: 'Covered is green, gaps are red (default).'
    },
    {
      value: 'green-transparent',
      label: 'Green → transparent',
      description: 'Covered areas fade to transparent; gaps stay red.'
    },
    {
      value: 'red-transparent',
      label: 'Red → transparent',
      description: 'Gaps fade to transparent; covered stays green (fades over 15–30 km).'
    },
    {
      value: 'isodistance',
      label: 'Isodistance lines',
      description: 'Default overlay plus 15/20/25 km border lines.'
    }
  ];

  const setMode = (mode: CoverageMode) => coverageTweaks.update((t) => ({ ...t, mode }));
  const setPanelOpen = (panelOpen: boolean) => coverageTweaks.update((t) => ({ ...t, panelOpen }));
</script>

{#if $coverageTweaks.panelOpen}
  <section class="coverage-tweaks" aria-label="Coverage display tweaks">
    <header>
      <h3>Coverage tweaks <span class="badge">prototype</span></h3>
      <button class="close" aria-label="Close tweaks panel" onclick={() => setPanelOpen(false)}>
        <Icon icon={crossIcon} />
      </button>
    </header>

    <fieldset>
      <legend>Display mode</legend>
      {#each MODES as mode}
        <label class="mode" class:selected={$coverageTweaks.mode === mode.value}>
          <input
            type="radio"
            name="coverage-mode"
            value={mode.value}
            checked={$coverageTweaks.mode === mode.value}
            onchange={() => setMode(mode.value)}
          />
          <span class="mode-text">
            <span class="mode-label">{mode.label}</span>
            <span class="mode-description">{mode.description}</span>
          </span>
        </label>
      {/each}
    </fieldset>
  </section>
{:else}
  <button class="coverage-tweaks-reopen" onclick={() => setPanelOpen(true)}>
    Coverage tweaks
  </button>
{/if}

<style>
  .coverage-tweaks {
    position: absolute;
    top: calc(env(safe-area-inset-top, 0px) + 4.5rem);
    right: 0.8rem;
    z-index: 20;
    width: 26rem;
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

  fieldset {
    border: none;
    margin: 0;
    padding: 0;
  }

  legend {
    font-weight: 600;
    padding: 0;
    margin-bottom: 0.4rem;
  }

  .mode {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.5rem 0.4rem;
    border-radius: 0.4rem;
    cursor: pointer;
  }

  .mode.selected {
    background: rgba(0, 0, 0, 0.05);
  }

  .mode input {
    margin-top: 0.3rem;
    flex-shrink: 0;
    cursor: pointer;
  }

  .mode-text {
    display: flex;
    flex-direction: column;
  }

  .mode-label {
    font-weight: 500;
    line-height: 1.3;
  }

  .mode-description {
    font-size: 1.2rem;
    color: var(--color-text-gray, #555);
    line-height: 1.3;
  }

  .coverage-tweaks-reopen {
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
