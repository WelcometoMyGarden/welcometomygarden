<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { Icon, Button } from '$lib/components/UI';
  import { crossIcon } from '$lib/images/icons';
  import { focusTrap } from '$lib/directives';

  const dispatch = createEventDispatcher<{ close: null }>();

  // a11y
  /**
   * Don't use together with ariaLabelledBy
   */
  export let ariaLabel: string | null = null;
  export let ariaLabelledBy: string | null = null;
  export let ariaDescribedBy: string | null = null;

  export let className: string = '';

  export let closeButton = true;
  export let cancelButton = false;
  export let closeOnEsc = true;
  export let closeOnOuterClick = true;
  export let maxWidth: string = '900px';
  export let maxHeight: string | undefined = undefined;
  export let show = true;

  export let center = false;
  export let stickToBottom = false;
  export let fullHeight = false;
  export let shrinkableBody = false;

  /**
   * Outer padding of the modal inside the screen
   */
  export let nopadding = false;
  /**
   * Padding inside the modal
   */
  export let noInnerPadding = false;
  /**
   * Whether the background should be opaque
   */
  export let opaqueBackground = true;
  /**
   * Override background-color
   */
  export let backgroundColor: string | undefined = opaqueBackground
    ? 'rgba(0, 0, 0, 0.6)'
    : undefined;
  export let transitionBackground = false;
  let effectiveBgColor = backgroundColor && transitionBackground ? 'transparent' : backgroundColor;

  /**
   * Whether the modal content should be transparent
   */
  export let transparent = false;

  const close = () => {
    show = false;
    dispatch('close');
  };

  let ref = null;

  const handleOuterClick = () => {
    if (!closeOnOuterClick) return;
    close();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!show) return;
    if (!closeOnEsc) return;
    if (e.key === 'Escape' || e.keyCode === 27) close();
  };

  onMount(() => {
    //  Trigger CSS background transition
    effectiveBgColor = backgroundColor;
  });

  // Note: this may not be relevant; unmount does not seem to happen.
  // But the effect does always replay. Debug by checking the initial value on onMount.
  onDestroy(() => {
    if (backgroundColor && transitionBackground) {
      effectiveBgColor = 'transparent';
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if show}
  <!-- Modal backdrop -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <!-- TODO: refactor this to be a <dialog>, but be careful, because it's used in many places -->
  <div
    class="modal {className}"
    class:center
    class:transitionBackground
    style:background-color={effectiveBgColor}
    class:stick-to-bottom={stickToBottom}
    class:nopadding
    class:noInnerPadding
    on:click|self={handleOuterClick}
    on:keypress={(e) => {
      if (e.key === 'Escape') handleOuterClick();
    }}
  >
    <!-- Modal dialog -->
    <div
      bind:this={ref}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      role="dialog"
      class="modal-content"
      class:fullHeight
      class:transparent
      style:max-width={maxWidth}
      style:max-height={maxHeight}
      use:focusTrap
      id="dialog"
    >
      <div class="modal-header">
        <!--
          {ariaLabelledBy} inserts an "arialabelledby" attribute (which is not a valid ARIA attribute)
          but it also propagates the given value of ariaLabelledBy back to the let:ariaLabelledBy property on the parent,
          so it can be used within slots by component users without repeating the concrete value of ariaLabelledBy.
          https://svelte.dev/docs/special-elements#slot-slot-key-value
        -->
        <slot name="title" {ariaLabelledBy} />
        {#if closeButton}
          <button class="close" type="button" on:click={close} aria-label="Close">
            <Icon icon={crossIcon} />
          </button>
        {/if}
      </div>
      <div class="modal-body" class:shrinkableBody>
        <!-- See note about ariaLabelledBy above -->
        <slot name="body" {ariaLabelledBy} {ariaDescribedBy} />
      </div>
      <div class="controls">
        {#if cancelButton}
          <Button type="button" uppercase inverse on:click={close}>Close</Button>
        {/if}<slot name="controls" />
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
    height: calc(var(--vh, 1vh) * 100);
    left: 0;
    padding: 2rem;
    top: 0;
  }

  @supports (height: 100dvh) {
    .modal {
      height: 100dvh;
    }
  }

  .transitionBackground {
    transition: background-color 0.4s ease-in;
  }

  .nopadding,
  .noInnerPadding .modal-content {
    padding: 0;
  }

  .stick-to-bottom {
    top: unset;
    justify-content: flex-end;
  }

  .stick-to-bottom .modal-content {
    border-radius: var(--modal-border-radius) var(--modal-border-radius) 0 0;
    max-height: 77%;
  }

  .center {
    justify-content: center;
  }

  /* Default modal-content props */
  .modal-content {
    position: relative;
    /*
      This is probably mostly used for the MembershipModal to clip
      its content with background fills to the border radius of this element.
      It's possible to make this opt-out if an element needs to be positioned
      aside from the modal content (and then override the radius overrides
      on the membership modal content itself)
    */
    overflow: auto;
    padding: 2rem;
    width: 100%;
    display: flex;
    flex-direction: column;
  }

  .modal-content:not(.transparent) {
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 0px 21.5877px rgba(0, 0, 0, 0.1);
    background-color: var(--color-white);
  }

  .modal-content.fullHeight {
    height: 100%;
  }

  .modal-content > * {
    flex: 1;
  }

  .modal-header {
    font-size: 18px;
    font-weight: bold;
    line-height: 1.5;

    display: flex;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .noInnerPadding .modal-header {
    margin-bottom: 0;
  }

  .modal-header :global(i) {
    height: 1.25rem;
    width: 1.25rem;
  }

  .modal-body {
    flex: 1 1 auto;
  }

  .modal-body.shrinkableBody {
    min-height: 0;
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

  .controls:not(:empty) {
    margin-top: 10px;
  }

  @media screen and (max-width: 700px) {
    .stick-to-bottom {
      bottom: calc(var(--height-mobile-nav));
    }
  }

  /* Otherwise rotating the device doesn't update this */
  @media (min-width: 701px) {
    .stick-to-bottom {
      bottom: 0;
    }
  }
</style>
