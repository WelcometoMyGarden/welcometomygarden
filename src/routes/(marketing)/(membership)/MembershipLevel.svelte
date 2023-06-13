<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { createEventDispatcher } from 'svelte';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { arrowRightIcon, checkIcon } from '$lib/images/icons';
  import type { LocaleDictionary } from '$lib/util/get-node-children';
  import type { HTMLLabelAttributes } from 'svelte/elements';
  export let selected = false;

  /**
   * Displays a card with more details
   */
  export let full = false;
  /**
   * Props only applicable for full cards
   */
  export let backref: string | undefined = undefined;
  export let checkList: (string | LocaleDictionary | null)[] | undefined = undefined;

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

  /**
   * Whether the parent should apply border styles
   */
  export let embeddable = false;
  const clickDispatch = createEventDispatcher<{ click: MouseEvent }>();
  const keyDispatch = createEventDispatcher<{ keypress: KeyboardEvent }>();

  /**
   * Whether this element is seen as a label for another semantic HTML input,
   * rather than having its own role="radio"
   */
  export let isLabelFor: string | undefined = undefined;

  $: isLabel = !!isLabelFor;
  $: is = isLabel ? 'label' : 'div';
</script>

<!-- TODO: report the for={} TS error
 Similar problem: https://github.com/sveltejs/language-tools/issues/1576
-->
<svelte:element
  this={is}
  class:full
  class="membership-level"
  class:selected
  class:reduced={slug === 'sow'}
  class:embeddable
  on:click={(e) => clickDispatch('click', e)}
  on:keypress={(e) => keyDispatch('keypress', e)}
  role={isLabel ? undefined : 'radio'}
  aria-checked={isLabel ? undefined : selected}
  for={isLabel ? isLabelFor : undefined}
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
        {#if value > 0}
          <span class="per-month"
            >(= €{value}{' '}{$_('become-superfan.pricing-section.per-month')})</span
          >
        {/if}
      </div>
    </div>
    <p class="description">{description}</p>
    {#if full && checkList}
      {#if backref}
        <p class="backref"><Icon icon={arrowRightIcon} />{backref}</p>
      {/if}
      <ul class="checklist" class:noBackref={!backref}>
        {#each checkList as item}
          <li><Icon icon={checkIcon} /><span>{@html item}</span></li>
        {/each}
      </ul>
    {/if}
  </div>
</svelte:element>

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

  .full .radio {
    display: none;
  }

  .checklist.noBackref {
    margin-top: 1.5rem;
  }

  @media screen and (max-width: 850px) {
    .full .radio {
      display: flex;
    }
    .full .backref :global(i) {
      transform: rotate(270deg);
      font-size: 1.1rem;
    }
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

  .membership-level h3 {
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

  .backref :global(i) {
    display: inline-block;
    vertical-align: middle;
    height: 1.2em;
    width: 1.2em;
    margin-right: 1rem;
  }

  .backref :global(i) {
    transform: rotate(180deg);
  }

  .backref {
    margin-bottom: 1.5rem;
  }

  .checklist {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .checklist > li :global(i svg g path) {
    fill: #19ae13;
  }
  .checklist > li {
    display: flex;
    align-items: flex-start;
    gap: 1.2rem;
  }
  .checklist > li :global(i) {
    display: block;
    width: 1.7rem;
    height: 1.7rem;
  }

  .checklist > li > * {
    flex: 1 0;
  }

  .checklist,
  .backref {
    font-size: 1.4rem;
  }

  .checklist :global(strong) {
    font-weight: 600;
  }

  @media screen and (min-width: 851px) {
    .checklist.noBackref {
      margin-top: 4.5rem;
    }
    .membership-level.full {
      /* flex: 1 0 0; */
      display: flex;
      flex-direction: column;
    }

    .membership-level.full:not(:first-child):not(:last-child) {
      flex: 1 0;
      width: 40%;
    }

    .membership-level.full:first-child,
    .membership-level.full:last-child {
      align-self: center;
      min-height: 80%;
      flex: 0 1 30%;
    }
    .membership-level.full:last-child {
      background-color: var(--color-white);
    }

    .full > .title-section {
      flex-grow: 1;
    }
    .full .description {
      font-size: 1.6rem;
      line-height: 1.4;
      font-weight: 500;
      /* height: 9rem; */
      margin-bottom: 2rem;
    }
  }
</style>
