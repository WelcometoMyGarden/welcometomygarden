<script lang="ts">
  import { LabeledCheckbox } from '$lib/components/UI';
  import Icon from '$lib/components/UI/Icon.svelte';
  import { crossIcon } from '$lib/images/icons';

  interface Props {
    name: string;
    icon?: null | string;
    label: string;
    checked?: boolean;
    disabled?: boolean;
    oninput?: (e: Event) => void;
    onchange: (e: Event) => void;
    onsecondary: (e: MouseEvent) => void;
  }

  let {
    name,
    icon = null,
    label,
    checked = $bindable(false),
    disabled = false,
    oninput,
    onchange,
    onsecondary
  }: Props = $props();
</script>

<div class="multi-action-label">
  <LabeledCheckbox ellipsis {name} {label} {disabled} {oninput} bind:checked {onchange} />
  <button
    class="button-unstyle secondary"
    onclick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onsecondary(e);
    }}
  >
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
    min-width: 2rem;
    height: 2rem;
    color: var(--color-text);
  }
</style>
