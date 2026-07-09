<!-- @component
  The "Let's spread WTMG across Europe" info box shown on the /every15km map.

  Colocated with the coverage map because it's a one-off. It is open by default
  and can be collapsed:
  - Desktop: a docked panel in the bottom-right of the map; collapses to a small
    pill with a chevron-up button. Expanding/collapsing slides it up/down.
  - Mobile: a bottom-sheet (shared `Modal.svelte`); collapses to a full-width bar
    with a circular chevron-up button.
-->
<script lang="ts">
  import { _, locale } from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import { innerWidth } from 'svelte/reactivity/window';
  import { Modal, Button, Icon } from '$lib/components/UI';
  import { crossIcon, chevronUpIcon } from '$lib/images/icons';
  import { COVERAGE_RADIUS_KM, LEGEND_COLORS } from '$lib/components/Map/CoverageLayer.svelte';
  import { MOBILE_BREAKPOINT } from '$lib/constants';
  import routes from '$lib/routes';
  import { lr } from '$lib/util/translation-helpers';
  import { getGardenCount } from '$lib/api/stats';

  interface Props {
    /** Opens the share modal (owned by the page). */
    onShare: () => void;
  }

  let { onShare }: Props = $props();

  let open = $state(true);

  const isMobile = $derived(innerWidth.current != null && innerWidth.current <= MOBILE_BREAKPOINT);

  // Open by default on desktop, collapsed by default on mobile. Applied once,
  // as soon as the viewport width is known (client-side).
  let didInitOpen = false;
  $effect(() => {
    const w = innerWidth.current;
    if (!didInitOpen && w != null) {
      didInitOpen = true;
      if (w <= MOBILE_BREAKPOINT) open = false;
    }
  });

  const ariaLabelledBy = 'every15km-infobox-title';

  const gardenCountPromise = getGardenCount();
  const formatCount = (count: number) => count.toLocaleString($locale ?? 'en');
</script>

<!-- Shared inner content (intro, legend, CTA, buttons, stats). -->
{#snippet content()}
  <div class="content">
    <p class="intro">{@html $_('map.every15km.intro')}</p>

    <ul class="legend">
      <li>
        <span class="swatch" style="background-color: rgb({LEGEND_COLORS.covered});"></span>
        <span>{$_('map.every15km.legend.covered', { values: { radius: COVERAGE_RADIUS_KM } })}</span
        >
      </li>
      <li>
        <span class="swatch" style="background-color: rgb({LEGEND_COLORS.gap});"></span>
        <span>{$_('map.every15km.legend.gap')}</span>
      </li>
    </ul>

    <p class="cta">{$_('map.every15km.cta')}</p>

    <div class="buttons">
      <Button uppercase medium fullWidth onclick={onShare}>
        {$_('map.every15km.share')}
      </Button>
      <Button uppercase medium fullWidth inverse href={$lr(routes.ADD_GARDEN)} target="_blank">
        {$_('map.every15km.add-garden')}
      </Button>
    </div>

    <hr />

    <p class="stats">
      {#await gardenCountPromise then count}
        {#if count != null}
          {$_('map.every15km.stats', { values: { count: formatCount(count) } })}
          <span class="sep">·</span>
        {/if}
      {/await}
      <a href={$lr(routes.MAP)} target="_blank" rel="noopener">{$_('map.every15km.explore-all')}</a>
    </p>
  </div>
{/snippet}

{#if isMobile}
  {#if open}
    <Modal
      bind:show={open}
      stickToBottom
      nopadding
      maxWidth="{MOBILE_BREAKPOINT}px"
      {ariaLabelledBy}
    >
      {#snippet title()}
        <div class="modal-title-section">
          <h2 id={ariaLabelledBy} class="title modal-title">{$_('map.every15km.title')}</h2>
        </div>
      {/snippet}
      {#snippet body()}
        {@render content()}
      {/snippet}
    </Modal>
  {:else}
    <!-- The whole bar is the expand control; the circle is a decorative affordance. -->
    <button
      class="collapsed-bar"
      transition:fly={{ y: 120, duration: 250 }}
      aria-label={$_('map.every15km.expand')}
      onclick={() => (open = true)}
    >
      <span class="collapsed-content">
        <span class="collapsed-emoji" aria-hidden="true">🏕️</span>
        <span class="collapsed-title">{$_('map.every15km.collapsed-title')}</span>
      </span>
      <span class="circle" aria-hidden="true"><Icon icon={chevronUpIcon} /></span>
    </button>
  {/if}
{:else if open}
  <section class="desktop-panel" transition:fly={{ y: 400, duration: 300 }}>
    <header class="desktop-header">
      <h2 id={ariaLabelledBy} class="title">{$_('map.every15km.title')} 🏕️</h2>
      <button
        class="close"
        type="button"
        aria-label={$_('map.every15km.collapse')}
        onclick={() => (open = false)}
      >
        <Icon icon={crossIcon} />
      </button>
    </header>
    {@render content()}
  </section>
{:else}
  <!-- The whole pill is the expand control; the circle is a decorative affordance. -->
  <button
    class="desktop-collapsed"
    transition:fly={{ y: 200, duration: 250 }}
    aria-label={$_('map.every15km.expand')}
    onclick={() => (open = true)}
  >
    <span class="title">{$_('map.every15km.title')} 🏕️</span>
    <span class="circle" aria-hidden="true"><Icon icon={chevronUpIcon} /></span>
  </button>
{/if}

<style>
  .title {
    font-family: var(--fonts-titles);
    font-weight: bold;
    line-height: 1.2;
  }

  /* Center the mobile bottom-sheet title across the full width, offsetting the
     30px close button on the right (mirrors MapToolModal / ShareModal). */
  .modal-title-section {
    flex: 1;
    padding-left: 30px;
  }

  .modal-title {
    text-align: center;
    font-size: 2.2rem;
  }

  /* ---- Shared inner content ---- */
  .content {
    display: flex;
    flex-direction: column;
  }

  .intro {
    font-size: 1.5rem;
    line-height: 1.5;
  }

  .intro :global(strong) {
    font-weight: bold;
  }

  .legend {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin: 1.6rem 0;
    font-size: 1.5rem;
  }

  .legend li {
    display: flex;
    align-items: center;
    gap: 0.8rem;
  }

  .swatch {
    flex-shrink: 0;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 3px;
  }

  .cta {
    font-size: 1.5rem;
    line-height: 1.5;
    margin-bottom: 1.6rem;
  }

  .buttons {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  hr {
    width: 100%;
    border: none;
    border-top: 1px solid var(--color-gray);
    margin: 1.6rem 0;
  }

  .stats {
    font-size: 1.4rem;
    color: var(--color-green-2);
  }

  .stats .sep {
    margin: 0 0.3rem;
  }

  .stats a {
    color: var(--color-green-2);
    text-decoration: underline;
  }

  .stats a:hover {
    color: var(--color-green);
  }

  /* ---- Desktop docked panel ---- */
  .desktop-panel {
    position: absolute;
    right: var(--spacing-map-controls);
    bottom: calc(var(--height-footer, 4.5rem) + var(--spacing-map-controls));
    z-index: 5;
    width: 36rem;
    max-height: calc(100% - var(--height-footer, 4.5rem) - 2 * var(--spacing-map-controls));
    overflow-y: auto;
    background-color: var(--color-white);
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 4px 14px rgba(0, 0, 0, 0.18);
    padding: 2rem;
  }

  .desktop-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.4rem;
  }

  /* Orange underline accent below the title (per the design). */
  .desktop-header .title {
    position: relative;
    /* Match the collapsed pill's title size so the text doesn't reflow on expand. */
    font-size: 1.8rem;
    margin-bottom: 1rem;
  }

  .desktop-header .title::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: -14px;
    width: 9rem;
    height: 3px;
    background-color: var(--color-orange);
    border-radius: 2px;
  }

  .desktop-panel .close {
    flex-shrink: 0;
    margin-top: -2.5px;
    padding: 0;
    border: 1.5px solid var(--color-green);
    border-radius: 50%;
    background-color: var(--color-white);
    cursor: pointer;
    height: 30px;
    width: 30px;
    min-width: 30px;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .desktop-panel .close :global(i) {
    height: 1.25rem;
    width: 1.25rem;
  }

  .desktop-panel .close:hover {
    background-color: var(--color-green);
  }

  .desktop-panel .close:hover :global(i > svg) {
    fill: var(--color-white);
  }

  /* ---- Desktop collapsed pill ---- */
  /* The whole pill is the expand button. Matches the expanded panel width. */
  .desktop-collapsed {
    position: absolute;
    right: var(--spacing-map-controls);
    bottom: calc(var(--height-footer, 4.5rem) + var(--spacing-map-controls));
    z-index: 5;
    width: 36rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background-color: var(--color-white);
    border: none;
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 4px 14px rgba(0, 0, 0, 0.18);
    padding: 1.6rem 1.8rem;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    color: var(--color-green);
  }

  .desktop-collapsed .title {
    font-size: 1.8rem;
  }

  /* ---- Mobile collapsed bar (the whole bar is the expand button) ---- */
  .collapsed-bar {
    position: absolute;
    left: var(--spacing-map-controls);
    right: var(--spacing-map-controls);
    /* The map container is already offset above the mobile nav (which includes
       the safe-area inset), so no extra safe-area inset is needed here. */
    bottom: var(--spacing-map-controls);
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    background-color: var(--color-white);
    border: none;
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 4px 14px rgba(0, 0, 0, 0.18);
    padding: 1.2rem 1.4rem;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    /* Reset the iOS user-agent blue button/link text colour. */
    color: var(--color-green);
  }

  /* Emoji stays top-left; the title wraps to its right. */
  .collapsed-content {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
  }

  .collapsed-emoji {
    flex-shrink: 0;
    font-size: 1.7rem;
    line-height: 1.2;
  }

  .collapsed-title {
    font-family: var(--fonts-titles);
    font-weight: bold;
    font-size: 1.7rem;
    line-height: 1.4;
  }

  /* Decorative chevron circle, shared by both collapsed variants. */
  .circle {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.4rem;
    height: 3.4rem;
    border: 1.5px solid var(--color-green);
    border-radius: 50%;
    color: var(--color-green);
    transition: background-color 200ms ease;
  }

  .circle :global(i) {
    width: 1.4rem;
    height: 1.4rem;
  }

  .collapsed-bar:hover .circle,
  .collapsed-bar:focus-visible .circle,
  .desktop-collapsed:hover .circle,
  .desktop-collapsed:focus-visible .circle {
    background-color: var(--color-green);
    color: var(--color-white);
  }
</style>
