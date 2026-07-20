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
    hoverStyle?: boolean;
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
    compact = false,
    hoverStyle = false
  }: Props = $props();
</script>

<LabelWithIcon class="radio-container" {ellipsis} {compact} labelFor={id} {icon} {hoverStyle}>
  {#snippet input()}
    <input {id} type="radio" {disabled} {name} {value} bind:group />
  {/snippet}
  {label}
</LabelWithIcon>

<style>
  @media screen and (max-width: 700px) {
    input {
      width: 2.5rem;
      height: 2.5rem;
    }
  }
</style>
