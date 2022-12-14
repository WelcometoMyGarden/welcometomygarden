<script lang="ts">
  import type { SuperfanLevelData } from '@/routes/become-superfan/+page.svelte';
  import { createEventDispatcher } from 'svelte';
  export let item: SuperfanLevelData;
  const clickDispatch = createEventDispatcher<{ click: MouseEvent }>();
  const keyDispatch = createEventDispatcher<{ keypress: KeyboardEvent }>();
</script>

<div
  class="superfan-level"
  on:click={(e) => clickDispatch('click', e)}
  on:keypress={(e) => keyDispatch('keypress', e)}
>
  <span class="price">€ {item.value}</span>
  <h3>{item.title}</h3>
</div>

<style>
  .superfan-level {
    border: 1px solid var(--color-green);
    border-radius: 0.75rem;
    padding: 1rem;
    cursor: pointer;
  }

  .price {
    font-size: x-large;
    font-weight: 700;
  }
</style>
