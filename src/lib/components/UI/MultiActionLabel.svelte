<script lang="ts">
  import { LabeledCheckbox } from '@/lib/components/UI';
  import Icon from '@/lib/components/UI/Icon.svelte';
  import { crossIcon } from '@/lib/images/icons';
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  export let name: string;
  export let icon: null | string = null;
  export let label: string;
  export let checked = false;
  export let disabled = false;
</script>

<div class="multi-action-label">
  <LabeledCheckbox ellipsis {icon} {name} {label} {disabled} on:input bind:checked on:change />
  <button class="button-unstyle secondary" on:click={(e) => dispatch('secondary', e)}>
    <Icon icon={crossIcon} />
  </button>
</div>

<style>
  .multi-action-label {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.5rem 0;
  }

  .secondary {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    color: var(--color-text);
  }
</style>
