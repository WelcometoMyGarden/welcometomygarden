<script lang="ts">
  import LabelWithIcon from './LabelWithIcon.svelte';
  interface Props {
    id: string;
    name: string;
    icon?: undefined | string;
    label: string;
    group: string;
    value: string;
    disabled?: boolean;
    ellipsis?: boolean;
    compact?: boolean;
  }

  let {
    id,
    name,
    icon = undefined,
    label,
    group = $bindable(),
    value,
    disabled = false,
    ellipsis = false,
    compact = false
  }: Props = $props();
</script>

<!-- Just stop click propagation from here -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  onclick={(e) => {
    e.stopPropagation();
  }}
>
  <input {id} type="radio" {disabled} {name} {value} bind:group />
  <LabelWithIcon {ellipsis} {compact} labelFor={id} {icon}>{label}</LabelWithIcon>
</div>

<style>
  div {
    display: flex;
    align-items: center;
    font-size: var(--controls-font-size);
    margin: 0.1rem 0;
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

    input {
      width: 2.5rem;
      height: 2.5rem;
    }
  }
</style>
