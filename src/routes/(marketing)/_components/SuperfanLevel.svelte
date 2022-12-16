<script lang="ts">
  import { IMAGES_PATH } from '@/lib/constants';
  import { createEventDispatcher } from 'svelte';
  import type { SuperfanLevelData } from '../_static/superfan-levels';
  export let item: SuperfanLevelData;
  const { slug, title, description, value, alt } = item;
  const clickDispatch = createEventDispatcher<{ click: MouseEvent }>();
  const keyDispatch = createEventDispatcher<{ keypress: KeyboardEvent }>();
</script>

<div
  class="superfan-level"
  on:click={(e) => clickDispatch('click', e)}
  on:keypress={(e) => keyDispatch('keypress', e)}
>
  <img src="{IMAGES_PATH}/pricing/{slug}.png" {alt} />
  <span class="slug">{slug.toLocaleUpperCase()}</span>
  <div>
    <h3>{title}</h3>
    <p class="description">{description}</p>
  </div>
  <div class="price">
    <div class="monthly"><span class="price-value">€{value}</span>/month</div>
    <div class="annual">= €{value * 12} billed anually</div>
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

  .superfan-level:hover {
    background-color: white;
    transition: background-color 0.4s;
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
    /* TODO: we need something even more bold, is 700 not loaded? */
    font-weight: 700;
    padding-right: 1rem;
  }
</style>
