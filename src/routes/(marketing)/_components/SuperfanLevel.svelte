<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { IMAGES_PATH } from '$lib/constants';
  import { createEventDispatcher } from 'svelte';
  export let selected = false;

  // Svelte learning: don't do this! This code executes only once,
  // which means only the first prop values will be destructured.
  // Subsequent updates don't get destructured, and the template doesn't react
  // when they change
  // export let level;
  // const { slug, title, description, value, alt, slugCopy } = level;
  export let slug: string;
  export let title: string;
  export let description: string;
  export let value: number;
  export let alt: string | undefined = undefined;
  export let slugCopy: string;
  const clickDispatch = createEventDispatcher<{ click: MouseEvent }>();
  const keyDispatch = createEventDispatcher<{ keypress: KeyboardEvent }>();
</script>

<div
  class="superfan-level"
  class:selected
  on:click={(e) => clickDispatch('click', e)}
  on:keypress={(e) => keyDispatch('keypress', e)}
>
  <!-- TODO: fix alt -->
  <span class="slug">{slugCopy.toLocaleUpperCase()}</span>
  <div>
    <h3>{title}</h3>
    <p class="description">{description}</p>
  </div>
  <div class="price">
    <div class="monthly">
      <span class="price-value">€{value}</span>{$_('become-superfan.pricing-section.per-month')}
    </div>
    <div class="annual">= €{value * 12}{$_('become-superfan.pricing-section.annual-amount')}</div>
  </div>
</div>

<style>
  .superfan-level {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border: 1px solid var(--color-green);
    border-radius: var(--tile-border-radius);
    padding: 1.5rem;
    cursor: pointer;
    gap: 1rem;
    transition: background-color 0.4s;
  }

  .superfan-level:hover,
  .superfan-level.selected {
    background-color: white;
    transition: background-color 0.4s;
  }

  .superfan-level.selected {
    border-width: 2px;
  }
  .superfan-level:not(.selected) {
    /* Compensate for the layout shift that occurs
      when the selected level gets 1px extra in border-width. */
    margin: 1px;
  }

  img {
    max-width: 10rem;
  }

  .superfan-level > span,
  h3 {
    font-family: var(--fonts-copy);
    display: block;
    margin-bottom: 0.5rem;
  }

  .description {
    max-width: 450px;
    margin-bottom: 0.5rem;
  }

  div.superfan-level h3 {
    font-size: inherit;
  }

  .slug {
    font-weight: 600;
    color: var(--color-orange);
  }

  .monthly {
    margin-bottom: 1rem;
  }

  .annual {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }

  .price-value {
    font-size: 5rem;
    font-weight: 600;
    padding-right: 1rem;
  }
</style>
