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
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <label on:click|stopPropagation>
    <input {id} type="radio" {disabled} {name} {value} bind:group on:input on:change />
    {#if icon}
      <div class="icon">
        <Icon {icon} />
      </div>
    {/if}
    <span class="label" class:ellipsis>{label}</span>
  </label>
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

  label {
    background-image: var(--icon);
    background-position: left center;
    background-repeat: no-repeat;
    display: flex;
    align-items: center;
    cursor: pointer;
    width: 100%;
  }

  .icon {
    width: 2rem;
    height: 1.8rem;
    display: inline-block;
    margin: 0 0.5rem 0 0.5rem;
  }

  .label {
    width: 100%;
  }

  .ellipsis {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
    .icon {
      height: 3.5rem;
      width: 3.5rem;
    }
    .icon {
      margin-right: 0.7rem;
    }
  }
</style>
