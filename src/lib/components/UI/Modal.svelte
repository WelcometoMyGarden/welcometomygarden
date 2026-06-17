<script lang="ts">
  import { Icon, Button, DragHandle } from '$lib/components/UI';
  import { crossIcon } from '$lib/images/icons';
  import { focusTrap, swipeToClose, slidePanelOut, CLOSE_ANIMATION_MS } from '$lib/attachments';

  /**
   * TODO: it would be nice to be able to universally fade in/out only the background,
   * especially for CommunityVideoModal.svelte.
   */

  interface Props {
    /**
     * Don't use together with ariaLabelledBy
     */
    ariaLabel?: string | null;
    ariaLabelledBy?: string | null;
    ariaDescribedBy?: string | null;
    className?: string;
    closeButton?: boolean;
    cancelButton?: boolean;
    closeOnEsc?: boolean;
    closeOnOuterClick?: boolean;
    maxWidth?: string;
    maxHeight?: string | undefined;
    show?: boolean;
    center?: boolean;
    stickToBottom?: boolean;
    fullHeight?: boolean;
    shrinkableBody?: boolean;
    /**
     * Outer padding of the modal inside the screen
     */
    nopadding?: boolean;
    /**
     * Padding inside the modal
     */
    noInnerPadding?: boolean;
    /**
     * Override background-color
     */
    backgroundColor?: string | undefined;
    /**
     * Whether the modal content background should be transparent.
     *
     * Currently only used to display a YouTube embed filling the modal, without weird white borders.
     */
    transparentContent?: boolean;
    onclose?: () => void;
    title?: import('svelte').Snippet<[any]>;
    body?: import('svelte').Snippet<[any]>;
    controls?: import('svelte').Snippet;
  }

  let {
    ariaLabel = null,
    ariaLabelledBy = null,
    ariaDescribedBy = null,
    className = '',
    closeButton = true,
    cancelButton = false,
    closeOnEsc = true,
    closeOnOuterClick = true,
    maxWidth = '900px',
    maxHeight = undefined,
    show = $bindable(true),
    center = false,
    stickToBottom = false,
    fullHeight = false,
    shrinkableBody = false,
    nopadding = false,
    noInnerPadding = false,
    backgroundColor = 'rgba(0, 0, 0, 0.6)',
    transparentContent = false,
    title,
    body,
    controls,
    onclose
  }: Props = $props();

  let outerDiv: HTMLDivElement | undefined = $state();
  let dialogEl: HTMLDivElement | undefined = $state();
  // True while a stick-to-bottom modal is playing its programmatic slide-out
  // (close button / backdrop / Escape), to avoid re-triggering it.
  let animatingClose = false;

  // Backdrop fade driven by the swipe-to-close gesture: 1 = fully
  // visible, 0 = transparent. `backdropTransition` is set inline only while a
  // swipe is in progress.
  let alphaFactor = $state(1);
  let backdropTransition = $state<string | undefined>(undefined);

  /** Scale the alpha of an `rgb()`/`rgba()` color by `factor` (for fading the backdrop). */
  const fadeColor = (color: string | undefined, factor: number): string | undefined => {
    if (!color || color === 'transparent' || factor >= 1) return color;
    const match = color.match(/^rgba?\(([^)]+)\)$/i);
    if (!match) return factor <= 0 ? 'transparent' : color;
    const parts = match[1].split(',').map((p) => p.trim());
    const [r, g, b] = parts;
    const alpha = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
    return `rgba(${r}, ${g}, ${b}, ${alpha * factor})`;
  };

  let currentBackgroundColor = $derived(fadeColor(backgroundColor, alphaFactor));

  // Reset the backdrop whenever the modal (re)opens, so a previous swipe-close
  // doesn't leave the backdrop transparent on the next open.
  $effect(() => {
    if (show) {
      alphaFactor = 1;
      backdropTransition = undefined;
    }
  });

  const close = () => {
    show = false;
    onclose?.();
  };

  /**
   * Close the modal. For stick-to-bottom (bottom-sheet) modals this plays the
   * same slide-out + backdrop fade as a swipe-to-close gesture, then removes
   * the modal once it lands. Other modals close immediately.
   */
  const animatedClose = () => {
    if (!stickToBottom || !dialogEl) {
      close();
      return;
    }
    if (animatingClose) return;
    animatingClose = true;
    // Fade the backdrop to transparent in sync with the panel sliding away.
    backdropTransition = `background-color ${CLOSE_ANIMATION_MS}ms ease`;
    alphaFactor = 0;
    slidePanelOut(dialogEl, 0, () => {
      animatingClose = false;
      close();
    });
  };

  const handleOuterClick = () => {
    if (!closeOnOuterClick) return;
    animatedClose();
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (!show) return;
    if (!closeOnEsc) return;
    if (e.key === 'Escape' || e.keyCode === 27) animatedClose();
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if show}
  <!-- Modal backdrop -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- TODO: refactor this to be a <dialog>, but be careful, because it's used in many places -->
  <div
    bind:this={outerDiv}
    class="modal {className}"
    class:center
    style:background-color={currentBackgroundColor}
    style:transition={backdropTransition}
    class:stick-to-bottom={stickToBottom}
    class:nopadding
    class:noInnerPadding
    onclick={(e) => {
      if (e.target === outerDiv) {
        // Only trigger when we click on outer element itself
        handleOuterClick();
      }
    }}
    onkeypress={(e) => {
      if (e.key === 'Escape') handleOuterClick();
    }}
  >
    <!-- Modal dialog -->
    <div
      bind:this={dialogEl}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-label={ariaLabel}
      role="dialog"
      class="modal-content"
      class:fullHeight
      class:transparentContent
      style:max-width={maxWidth}
      style:max-height={maxHeight}
      {@attach focusTrap}
      {@attach stickToBottom &&
        swipeToClose(() => ({
          onClose: close,
          // Fade the backdrop with the finger, then to fully transparent in sync
          // with the panel sliding out — so the backdrop never just vanishes.
          onProgress: (progress) => {
            backdropTransition = 'none';
            alphaFactor = 1 - progress;
          },
          onCloseStart: (durationMs) => {
            // target: to transparent = alpha 0
            backdropTransition = `background-color ${durationMs}ms ease`;
            alphaFactor = 0;
          },
          onCancel: () => {
            // target: back to the open state = alpha 1
            backdropTransition = 'background-color 200ms ease';
            alphaFactor = 1;
          }
        }))}
      id="dialog"
    >
      {#if stickToBottom}
        <DragHandle />
      {/if}
      <div class="modal-header">
        <!--
          {ariaLabelledBy} inserts an "arialabelledby" attribute (which is not a valid ARIA attribute)
          but it also propagates the given value of ariaLabelledBy back to the let:ariaLabelledBy property on the parent,
          so it can be used within slots by component users without repeating the concrete value of ariaLabelledBy.
          https://svelte.dev/docs/special-elements#slot-slot-key-value
        -->
        {@render title?.({ ariaLabelledBy })}
        {#if closeButton}
          <button class="close" type="button" onclick={animatedClose} aria-label="Close">
            <Icon icon={crossIcon} />
          </button>
        {/if}
      </div>
      <div class="modal-body" class:shrinkableBody>
        <!-- See note about ariaLabelledBy above -->
        {@render body?.({ ariaLabelledBy, ariaDescribedBy })}
      </div>
      <div class="controls">
        {#if cancelButton}
          <Button type="button" uppercase inverse onclick={animatedClose}>Close</Button>
        {/if}{@render controls?.()}
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
    padding: calc(env(safe-area-inset-top, 0px) + 2rem) 2rem
      calc(env(safe-area-inset-bottom, 0px) + 2rem) 2rem;
    top: 0;
  }

  /* For consistency: this cuts off the bottom shadow of the modal content which would fall on top of the mobile nav,
    which is not how it looks on the GardenDrawer
     */
  .modal.stick-to-bottom {
    overflow: hidden;
  }

  @supports (height: 100dvh) {
    .modal {
      height: 100dvh;
    }
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
    /* Pull the drag handle up slightly into the modal's top padding */
    --drag-handle-margin: -0.5rem auto 1.5rem;
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

  .modal-content:not(.transparentContent) {
    border-radius: var(--modal-border-radius);
    box-shadow: 0px 0px 21.5877px rgba(0, 0, 0, 0.1);
    background-color: var(--color-white);
  }

  .modal-content.fullHeight {
    height: 100%;
  }

  .modal-content > * {
    flex: 1 auto;
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
