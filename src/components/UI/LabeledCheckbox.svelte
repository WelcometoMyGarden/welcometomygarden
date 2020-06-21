<script>
  export let name;
  export let icon = null;
  export let label;
  export let checked = false;
  export let disabled = false;

  import Icon from './Icon.svelte';
</script>

<div>
  <input id={name} type="checkbox" {disabled} {name} on:input bind:checked />
  <label for={name}>
    {#if icon}
      <div class="icon">
        <Icon {icon} />
      </div>
    {/if}
    {label}
  </label>
</div>

<style>
  div {
    display: flex;
    align-items: center;
  }

  input {
    margin-right: 1rem;
  }

  label {
    background-image: var(--icon);
    background-position: left center;
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
  }

  .icon {
    width: 2rem;
    height: 1.8rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }
</style>
