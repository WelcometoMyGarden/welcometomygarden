<script>
  import { createEventDispatcher } from 'svelte';
  import { crossIcon } from '@/images/icons';
  import { Icon, Button } from './index';
  export let name;
  export let label;
  export let icon = null;
  export let closeButton = true;

  const dispatch = createEventDispatcher();

  const close = () => {
    dispatch('close');
  };
</script>

<div class="tag" on:click>
  <label for={name}>
    {#if icon}
      <div class="icon">
        <Icon {icon} />
      </div>
    {/if}
    {label}
  </label>
  {#if closeButton}
    <button class="icon close" on:click={close}>
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
    align-items: flex-start;
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
</style>
