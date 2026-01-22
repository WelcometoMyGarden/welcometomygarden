<script lang="ts">
  import LabelWithIcon from './LabelWithIcon.svelte';
  interface Props {
    name: string;
    icon?: undefined | string;
    /**
     * Choose a label or a slot
     */
    label?: string | undefined;
    checked?: boolean;
    disabled?: boolean;
    ellipsis?: boolean;
    compact?: boolean;
    title?: undefined | string;
    onclick?: (e: MouseEvent) => void;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    children?: import('svelte').Snippet;
  }

  let {
    name,
    icon = undefined,
    label = undefined,
    // Can't have a default value because some component users
    // initialize it with undefined
    checked = $bindable(),
    disabled = false,
    ellipsis = false,
    compact = false,
    title = undefined,
    onclick,
    onchange,
    oninput,
    children
  }: Props = $props();
</script>

<!-- Just stop click propagation from here -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  onclick={(e) => {
    e.stopPropagation();
    onclick?.(e);
  }}
  class:compact
  class="checkbox-container"
>
  <input id={name} type="checkbox" {disabled} {name} {oninput} bind:checked {onchange} />
  <LabelWithIcon {ellipsis} {compact} title={label} labelFor={name} {icon}
    >{label ?? ''}{@render children?.()}</LabelWithIcon
  >
</div>

<style>
  div {
    display: flex;
    align-items: center;
    margin: 0.1rem 0;
    font-size: var(--controls-font-size);
    /* Make sure that titles that are too long can get collapsed */
    min-width: 0;
  }

  input {
    margin-right: 1rem;
    cursor: pointer;
  }

  @media screen and (max-width: 700px) {
    div {
      margin: var(--controls-vert-margin) 0;
      padding: var(--controls-vert-padding) 0;
    }

    div.compact {
      margin: calc(0.5 * var(--controls-vert-margin)) 0;
      padding: calc(0.25 * var(--controls-vert-padding)) 0;
    }

    input {
      width: 2.1rem;
      height: 2.1rem;
    }
  }
</style>
