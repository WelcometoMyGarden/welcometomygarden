<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { crossIcon } from '$lib/images/icons';
  import { Icon } from '../UI';
  export let name;
  export let icon: string | null = null;
  export let closeButton = true;
  export let pointer = false;
  export let invert = false;

  const dispatch = createEventDispatcher();

  const close = () => {
    dispatch('close');
  };
</script>

<div class="tag" class:invert>
  <label for={name} on:click on:keypress class:pointer>
    {#if icon}
      <div class="icon">
        <Icon {icon} />
      </div>
    {/if}
    <slot />
  </label>
  {#if closeButton}
    <button
      class="icon close"
      on:click={close}
      on:keypress={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <Icon icon={crossIcon} />
    </button>
  {/if}
</div>

<style>
  .tag {
    background-color: var(--color-white);
    padding: 0.5rem;
    border-radius: 14px;

    margin: 0.25rem;
    display: flex;
    align-items: center;
  }

  .pointer {
    cursor: pointer;
  }

  label {
    padding: 0 0.5rem 0 0.5rem;
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
    margin: 0 0.5rem 0 0;
  }

  button.close {
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 50%;
    background-color: var(--color-white);
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  button.close:hover {
    background-color: var(--color-green);
  }

  button.close:hover > :global(i > svg) {
    fill: var(--color-white);
  }

  .invert {
    background-color: var(--color-green);
    color: var(--color-white);
  }

  .invert button.close {
    color: var(--color-white);
    background-color: var(--color-green);
  }

  .invert button.close > :global(i > svg) {
    fill: var(--color-white);
  }

  .invert button.close:hover {
    color: var(--color-green);
    background-color: var(--color-white);
  }

  .invert button.close:hover > :global(i > svg) {
    fill: var(--color-green);
  }
</style>
