<script lang="ts">
  export let name: string;
  export let icon: null | string = null;
  export let label: string;
  export let checked = false;
  export let disabled = false;
  export let ellipsis = false;
  export let compact = false;

  import Icon from './Icon.svelte';
</script>

<!-- Just stop click propagation from here -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div on:click|stopPropagation class:compact>
  <input id={name} type="checkbox" {disabled} {name} on:input bind:checked on:change />
  <label for={name} class="label">
    {#if icon}
      <div class="icon">
        <Icon {icon} />
      </div>
    {/if}
    <span class:ellipsis>{label}</span>
  </label>
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

  label {
    background-image: var(--icon);
    background-position: left center;
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .label {
    width: 100%;
  }

  .icon {
    height: 2rem;
    padding-right: 0.2rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }

  .icon :global(svg path.cls-1) {
    fill: var(--color-green);
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compact .icon {
    width: 2.6rem;
    height: 2.6rem;
  }

  @media screen and (max-width: 700px) {
    div {
      margin: var(--controls-vert-margin) 0;
      padding: var(--controls-vert-padding) 0;
    }

    input {
      width: 2.1rem;
      height: 2.1rem;
    }
    .icon {
      height: 3rem;
      width: 3rem;
    }
    .icon {
      margin-right: 0.4rem;
    }
  }
</style>
