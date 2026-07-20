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
    hoverStyle?: boolean;
    oninput?: (e: Event) => void;
    onchange?: (e: Event) => void;
    /** Optional content rendered between the checkbox and the label. */
    leading?: import('svelte').Snippet;
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
    hoverStyle = false,
    onchange,
    oninput,
    leading,
    children
  }: Props = $props();
</script>

<LabelWithIcon
  class="checkbox-container"
  {ellipsis}
  {compact}
  title={label}
  {icon}
  {leading}
  {hoverStyle}
>
  {#snippet input()}
    <input id={name} type="checkbox" {disabled} {name} {oninput} bind:checked {onchange} />
  {/snippet}
  {label ?? ''}{@render children?.()}
</LabelWithIcon>

<style>
  :global(label.checkbox-container) {
    /* Make sure that titles that are too long can get collapsed */
    min-width: 0;
  }

  @media screen and (max-width: 700px) {
    /* Bigger input checkbox on mobile
    normal width/height is not respected in the flex layout
    */
    input {
      min-width: 2rem;
      min-height: 2rem;
    }
  }
</style>
