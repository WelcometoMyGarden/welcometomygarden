<script lang="ts">
  export let id: string;
  export let name: string;
  export let icon: undefined | string = undefined;
  export let label: string;
  export let group: string;
  export let value: string;
  export let disabled = false;
  export let ellipsis = false;
  export let compact = false;

  import LabelWithIcon from './LabelWithIcon.svelte';
</script>

<!-- Just stop click propagation from here -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div on:click|stopPropagation>
  <input {id} type="radio" {disabled} {name} {value} bind:group on:input on:change />
  <LabelWithIcon {ellipsis} {compact} labelFor={name} {icon}>{label}</LabelWithIcon>
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
