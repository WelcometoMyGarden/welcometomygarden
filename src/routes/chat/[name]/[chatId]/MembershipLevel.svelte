<script lang="ts">
  import { _ } from 'svelte-i18n';
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
  /**
   * Whether the parent should apply border styles
   */
  export let embeddable = false;
  const clickDispatch = createEventDispatcher<{ click: MouseEvent }>();
  const keyDispatch = createEventDispatcher<{ keypress: KeyboardEvent }>();
</script>

<div
  class="membership-level"
  class:selected
  class:reduced={slug === 'sow'}
  class:embeddable
  on:click={(e) => clickDispatch('click', e)}
  on:keypress={(e) => keyDispatch('keypress', e)}
  role="radio"
  aria-checked={selected}
>
  <!-- https://stackoverflow.com/a/61812443 -->

  <!-- TODO: fix alt -->
  <div class="radio">
    {#if selected}
      <div class="radio-selected" />
    {/if}
  </div>
  <div class="title-section">
    <h3>{title}</h3>
    <div class="price">
      <span class="price-value">€{value * 12}</span>
      <div class="per-year">
        <div>{$_('become-superfan.pricing-section.per-year')}</div>
        <span class="per-month"
          >(= €{value}{' '}{$_('become-superfan.pricing-section.per-month')})</span
        >
      </div>
    </div>
    <p class="description">{description}</p>
  </div>
</div>

<style>
  .membership-level {
    display: grid;
    grid-template-areas: 'img title';
    padding: 1.5rem;
    cursor: pointer;
    gap: 1.5rem;
    transition: background-color 0.4s;
  }

  .membership-level:not(.embeddable) {
    border: 1px solid var(--color-green);
    border-radius: var(--tile-border-radius);
  }

  .membership-level:not(.embeddable).reduced {
    border: 1px solid var(--color-gray);
  }

  .membership-level:not(.embeddable):hover,
  .membership-level:not(.embeddable).selected {
    background-color: white;
    border: 1px solid var(--color-green);
    transition: background-color 0.4s;
  }

  .membership-level:not(.embeddable).selected {
    border-width: 2px;
  }
  .membership-level:not(.embeddable):not(.selected) {
    /* Compensate for the layout shift that occurs
      when the selected level gets 1px extra in border-width. */
    margin: 1px;
  }

  .radio {
    width: 3rem;
    height: 3rem;
    border-radius: 50%;
    position: relative;
    border: 1px solid var(--color-green);
    background-color: var(--white);
    display: flex;
    justify-content: center;
    align-items: center;
    align-self: center;
  }

  .radio-selected {
    background-color: var(--color-info);
    border-radius: 50%;
    width: 84%;
    height: 84%;
  }

  img {
    max-width: 4rem;
    grid-area: img;
  }

  .title-section {
    grid-area: title;
  }

  h3 {
    font-family: var(--fonts-copy);
    font-weight: 500;
    display: block;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }

  .description {
    font-size: 1.4rem;
    line-height: 1.3;
    color: var(--color-dark-gray);
    max-width: 450px;
    margin-bottom: 0.5rem;
  }

  div.membership-level h3 {
    font-size: inherit;
  }

  .per-year {
    font-size: 1.5rem;
    margin-left: 0.5rem;
    line-height: 1.1;
    /* margin-bottom: 0.5rem;
    margin-bottom: 1rem; */
  }

  .price {
    margin: 1.2rem 0;
    display: flex;
    align-items: center;
  }

  .per-month {
    padding-right: 1rem;
    font-size: 0.9em;
  }

  .price-value {
    font-size: 3.5rem;
    font-weight: 500;
  }
</style>
