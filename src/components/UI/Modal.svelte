<script>
  import { createEventDispatcher } from 'svelte';
  import { Icon, Button } from './index';
  import { crossIcon } from '@/images/icons';
  import { focusTrap } from '@/directives';

  const dispatch = createEventDispatcher();

  // a11y
  export let ariaLabel = null;
  export let ariaLabelledBy = null;
  export let ariaDescribedBy = null;

  export let closeButton = true;
  export let cancelButton = false;
  export let closeOnEsc = true;
  export let closeOnOuterClick = true;
  export let maxWidth = '';
  export let show = false;

  export let radius = false;

  const close = () => {
    show = false;
    dispatch('close');
  };

  let ref = null;

  const handleOuterClick = () => {
    if (!closeOnOuterClick) return;
    close();
  };

  const handleKeydown = (e) => {
    if (!show) return;
    if (!closeOnEsc) return;
    if (e.key === 'Escape' || e.keyCode === 27) close();
  };

  $: if (show) {
    document.body.setAttribute('data-modal', true);
  } else {
    document.body.removeAttribute('data-modal');
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <div class="modal" on:click|self={handleOuterClick}>
    <div
      bind:this={ref}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      role="dialog"
      class="modal-content"
      style="max-width:{maxWidth};"
      use:focusTrap
      class:radius>
      <div class="modal-header">
        <slot name="title" {ariaLabelledBy} class="modal-title" />
        {#if closeButton}
          <button class="close" type="button" on:click={close} aria-label="Close">
            <Icon icon={crossIcon} />
          </button>
        {/if}
      </div>
      <div class="modal-body">
        <slot name="body" {ariaLabelledBy} {ariaDescribedBy} />
      </div>
      <div class="controls">
        {#if cancelButton}
          <Button type="button" uppercase inverse on:click={close}>Close</Button>
        {/if}
        <slot name="controls" />
      </div>
    </div>
  </div>
{/if}

<style>
  .modal {
    position: fixed;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    padding: 2rem;
  }

  .modal-content {
    position: relative;
    overflow: auto;
    box-shadow: 0px 0px 21.5877px rgba(0, 0, 0, 0.1);
    padding: 4rem;
    background-color: var(--color-white);
    width: 100%;
    z-index: 1000;
  }

  .modal-content :global(.title) {
    text-transform: uppercase;
    font-weight: bold;
  }

  .modal-header {
    font-size: 18px;
    font-weight: bold;
    line-height: 1.5;

    display: flex;
    justify-content: space-between;

    margin-bottom: 25px;
  }

  .modal-header :global(.title) {
    margin-right: 1rem;
  }

  .modal-header :global(i) {
    height: 20px;
    width: 20px;
  }

  button.close {
    margin: -2.5px 0 0 auto;
    padding: 0;

    border: 1.5px solid var(--color-green);
    border-radius: 50%;

    background-color: var(--color-white);
    cursor: pointer;
    height: 30px;
    width: 30px;
    min-width: 30px;
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

  .controls {
    margin-top: 10px;
    display: flex;
    justify-content: flex-end;
  }

  .controls > :global(*) {
    margin-right: 10px;
  }

  .radius {
    border-radius: 10px;
  }
</style>
