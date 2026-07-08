<script lang="ts">
  /**
   * Temporary prototype overlay for experimenting with how uploaded routes are displayed.
   *
   * NOTE: this is a one-off, self-contained tweaks panel. It can be removed together with
   * `$lib/stores/routeTweaks` and the related handling in `FileTrails.svelte`.
   */
  import { routeTweaks, type RouteNamePlacement } from '$lib/stores/routeTweaks';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon } from '$lib/images/icons';

  const setPanelOpen = (panelOpen: boolean) => routeTweaks.update((t) => ({ ...t, panelOpen }));

  const onNamePlacementChange = (e: Event) =>
    routeTweaks.update((t) => ({
      ...t,
      routeNamePlacement: (e.currentTarget as HTMLSelectElement).value as RouteNamePlacement
    }));
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
      <label class="label" for="name-placement">Route name placement</label>
      <select
        id="name-placement"
        value={$routeTweaks.routeNamePlacement}
        onchange={onNamePlacementChange}
      >
        <option value="onRoute">On the route</option>
        <option value="besideRoute">Next to the route</option>
      </select>
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

  select {
    font-size: 1.3rem;
    padding: 0.3rem 0.4rem;
    border: 1px solid var(--color-gray, #ccc);
    border-radius: 0.4rem;
    background: #fff;
    cursor: pointer;
    max-width: 14rem;
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
