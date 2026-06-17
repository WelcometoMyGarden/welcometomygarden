<!--
  A small grab bar shown at the top of swipe-to-close bottom sheets, indicating
  the sheet can be dragged down to dismiss. The gesture itself is handled by the
  `swipeToClose` attachment on the panel; the `data-swipe-handle` marker tells it
  this element is the (mouse) drag handle.

  Hidden when we're confident the device has no touch input at all — matching
  the `(any-pointer: coarse)` gate the `swipeToClose` gesture uses, so the bar
  only shows where dragging actually works.

  Parents control layout via two inherited custom properties:
  - `--drag-handle-margin`  (default `0 auto 1.5rem`) — spacing around the bar
  - `--drag-handle-display` (default `block`) — e.g. set to `none` to hide it
-->
<div class="drag-handle" data-swipe-handle></div>

<style>
  .drag-handle {
    position: relative;
    display: var(--drag-handle-display, block);
    width: 4rem;
    height: 0.4rem;
    margin: var(--drag-handle-margin, 0 auto 1.5rem);
    background-color: var(--color-gray);
    border-radius: 2px;
    cursor: grab;
    touch-action: none;
    flex-shrink: 0;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  /* Enlarge the pointer hit area (mainly for the mouse) without changing the
     visible bar or the layout — the bar itself is only 0.4rem tall. */
  .drag-handle::before {
    content: '';
    position: absolute;
    inset: -1rem -1.5rem;
  }

  /* No coarse pointer anywhere: we're confident there's no touch screen, so
     hide the handle (the gesture is disabled to match — see swipe-to-close.ts). */
  @media not all and (any-pointer: coarse) {
    .drag-handle {
      display: none;
    }
  }
</style>
