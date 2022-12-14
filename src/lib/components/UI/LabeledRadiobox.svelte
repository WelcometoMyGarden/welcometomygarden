<script lang="ts">
  export let id: string;
  export let name: string;
  export let icon: null | string = null;
  export let label: string;
  export let group: string;
  export let value: string;
  export let disabled = false;
  export let ellipsis = false;

  import Icon from './Icon.svelte';
</script>

<div>
  <label>
    <input {id} type="radio" {disabled} {name} {value} bind:group on:input on:change />
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

  .icon {
    width: 2rem;
    height: 1.8rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
