<script lang="ts">
  import Icon from './Icon.svelte';

  /**
   * A selectable "card" radio option: an icon in a circle, a title, a description and a radio dot.
   * Used inside the "Unlist your garden" modal to choose between unlisting modes.
   */
  interface Props {
    /** The bound selected value of the radio group. */
    group: string | null;
    /** This option's value. */
    value: string;
    /** Shared radio group name. */
    name: string;
    /** Inlined SVG (from `$lib/images/icons`). Tinted via currentColor. */
    icon: string;
    title: string;
    description: string;
  }

  let { group = $bindable(), value, name, icon, title, description }: Props = $props();

  const selected = $derived(group === value);
</script>

<label class="mode" class:on={selected}>
  <input type="radio" {name} {value} bind:group />
  <span class="mode-icon"><Icon {icon} /></span>
  <span class="mode-text">
    <span class="mode-title">{title}</span>
    <span class="mode-desc">{description}</span>
  </span>
  <span class="radio"></span>
</label>

<style>
  .mode {
    position: relative;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border: 1.5px solid var(--color-gray);
    border-radius: 10px;
    cursor: pointer;
    transition:
      border-color 200ms,
      background 200ms;
  }

  /* Visually hidden but still focusable/announced. */
  .mode input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .mode-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-beige-light);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--color-green);
    transition:
      background 200ms,
      color 200ms;
  }

  .mode-icon :global(i) {
    width: 20px;
    height: 20px;
  }

  /* Tint the icon to follow the wrapper's `color`, regardless of whether the source SVG is
     fill-based (calendar) or stroke-based (hide). */
  .mode-icon :global(svg [fill]:not([fill='none'])) {
    fill: currentColor;
  }
  .mode-icon :global(svg [stroke]:not([stroke='none'])) {
    stroke: currentColor;
  }

  .mode-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .mode-title {
    font-weight: 600;
    font-size: 15px;
    color: var(--color-green);
  }

  .mode-desc {
    font-size: 14px;
    color: var(--color-darker-gray);
    line-height: 1.4;
    margin-top: 2px;
  }

  .radio {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1.5px solid var(--color-gray);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 200ms;
  }

  .mode.on {
    border-color: var(--color-green);
    background: rgba(73, 87, 71, 0.04);
  }

  .mode.on .mode-icon {
    background: var(--color-green);
    color: #fff;
  }

  .mode.on .radio {
    border-color: var(--color-orange);
  }

  .mode.on .radio::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--color-orange);
  }

  /* Keyboard focus visibility (input is visually hidden). */
  .mode:focus-within {
    border-color: var(--color-green);
  }

  @media (prefers-reduced-motion: reduce) {
    .mode,
    .mode-icon,
    .radio {
      transition: none;
    }
  }
</style>
