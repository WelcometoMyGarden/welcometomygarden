<script lang="ts">
  export let name: string;
  export let icon: undefined | string = undefined;
  /**
   * Choose a label or a slot
   */
  export let label: string | undefined = undefined;
  export let checked = false;
  export let disabled = false;
  export let ellipsis = false;
  export let compact = false;

  import LabelWithIcon from './LabelWithIcon.svelte';
</script>

<!-- Just stop click propagation from here -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div on:click|stopPropagation class:compact class="checkbox-container">
  <input id={name} type="checkbox" {disabled} {name} on:input bind:checked on:change />
  <LabelWithIcon {ellipsis} {compact} labelFor={name} {icon}>{label ?? ''}<slot /></LabelWithIcon>
</div>

<style>
  div {
    display: flex;
    align-items: center;
    margin: 0.1rem 0;
    font-size: var(--controls-font-size);
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
