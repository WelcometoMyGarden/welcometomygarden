import type { Attachment } from 'svelte/attachments';

export type SwipeToCloseOptions = {
  /** Called when the user swipes the panel down past the threshold. */
  onClose: () => void;
  /** Minimum downward distance (in px) required to trigger a close. Defaults to 110. */
  threshold?: number;
  /**
   * How the panel leaves on a committed swipe:
   * - `true` (default): the attachment slides the panel off the bottom itself,
   *   then calls `onClose` once it lands. Suited to panels that are removed
   *   from the DOM on close (e.g. the modal).
   * - `false`: the attachment leaves the panel at the drag offset, restores
   *   stylesheet transitions, and immediately calls `onClose`, letting the
   *   caller's own close mechanism (e.g. a CSS `.hidden` class) animate the
   *   rest of the way from where the finger left off. The caller MUST clear
   *   the leftover inline transform once the panel is hidden (otherwise a
   *   reused element stays stranded off-screen).
   *
   *   Currently only used by GardenDrawer which is hidden/animated out
   *   asynchronously after a navigation.
   *
   */
  animateOut?: boolean;
  /**
   * Live drag progress in `[0, 1]` (fraction of the panel's height dragged),
   * emitted on every move. Lets the caller fade a backdrop along with the finger.
   */
  onProgress?: (progress: number) => void;
  /**
   * A committed swipe is starting its close-out over `durationMs`. Lets the
   * caller finish any close-out visuals (e.g. fade a backdrop to transparent)
   * in sync with the panel leaving.
   */
  onCloseStart?: (durationMs: number) => void;
  /** A short swipe snapped back: the caller should revert any close-out visuals. */
  onCancel?: () => void;
};

/** Duration (ms) of the slide-out animation, kept in sync with the drawer's
 *  `.hidden` CSS transition so swipe-close and button-close feel identical. */
export const CLOSE_ANIMATION_MS = 250;
/** Easing of the slide-out, matching the stylesheet's default `transform` transition. */
export const CLOSE_EASING = 'ease';

/**
 * Slide `panel` fully off the bottom of the viewport over `durationMs`, then
 * call `onDone` once the transform transition lands (with a timeout fallback in
 * case `transitionend` never fires). `offset` is the panel's current inline
 * `translateY` (px) so the travel distance accounts for an in-progress drag;
 * pass `0` for a close that starts from the resting position (e.g. a button or
 * backdrop click).
 *
 * Callers are expected to remove the panel from the DOM once `onDone` fires, so
 * no inline-style cleanup is performed here — a fresh element is created on the
 * next open.
 */
export function slidePanelOut(
  panel: HTMLElement,
  offset: number,
  onDone: () => void,
  durationMs: number = CLOSE_ANIMATION_MS,
  easing: string = CLOSE_EASING
) {
  // Distance from the panel's current top to the bottom of the viewport:
  // translating by this pushes the entire panel below the fold. `offset` is
  // added back because the current rect already includes any drag.
  const distance = window.innerHeight - panel.getBoundingClientRect().top + offset;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    panel.removeEventListener('transitionend', onTransitionEnd);
    onDone();
  };
  const onTransitionEnd = (e: TransitionEvent) => {
    if (e.target === panel && e.propertyName === 'transform') finish();
  };
  panel.addEventListener('transitionend', onTransitionEnd);

  panel.style.transition = `transform ${durationMs}ms ${easing}`;
  // Force a reflow so the browser registers the current (drag) position as the
  // transition's starting point before we set the target transform.
  void panel.offsetHeight;
  panel.style.transform = `translateY(${distance}px)`;

  // Fallback in case transitionend never fires (e.g. interrupted layout).
  window.setTimeout(finish, durationMs + 50);
}

/**
 * Find the nearest scrollable element between `start` (inclusive) and `panel`
 * (inclusive). Used to decide whether a downward touch should drag the panel
 * or scroll its content: a swipe-to-close should only begin when the content
 * under the finger is already scrolled to the top.
 */
function nearestScrollable(start: Element | null, panel: HTMLElement): HTMLElement | null {
  let el: Element | null = start;
  while (el instanceof HTMLElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
      return el;
    }
    if (el === panel) break;
    el = el.parentElement;
  }
  return null;
}

/**
 * Media query that matches when *any* connected pointer is coarse — i.e. the
 * device has some touch capability, even if a mouse/trackpad is the primary
 * input (e.g. a touchscreen laptop). We only consider the user to be "surely
 * not on a touch screen" when this does NOT match, in which case the gesture
 * is disabled entirely and the drag handle is hidden (see DragHandle.svelte,
 * which gates its visibility on the same query).
 */
export const COARSE_POINTER_QUERY = '(any-pointer: coarse)';

/**
 * Swipe-down-to-close gesture for bottom sheets.
 *
 * Attach this to the panel element that should move with the pointer (e.g. the
 * modal content or drawer). On a swipe past `threshold` it either slides the
 * panel out itself (`animateOut: true`, the default) or hands off to the
 * caller's own close animation (`animateOut: false`) before calling `onClose`;
 * shorter swipes snap back.
 *
 * Two input paths, both gated behind {@link COARSE_POINTER_QUERY} so the
 * gesture is entirely inert on devices we're confident have no touch input:
 * - **Touch** drags can start anywhere on the panel, but only once the
 *   scrollable content under the finger (if any) is scrolled to the top, so the
 *   gesture never competes with native scrolling.
 * - **Mouse** drags only start on the drag handle (any element marked
 *   `data-swipe-handle`), never the whole panel — so on touchscreen laptops,
 *   where we can't be sure which input the user reaches for, the panel can still
 *   be dismissed by dragging its handle with the mouse without hijacking
 *   ordinary clicks/selection in the body.
 *
 * Elements marked with `data-swipe-ignore` (e.g. a close button) are excluded.
 */
export default function swipeToClose(getOptions: () => SwipeToCloseOptions): Attachment {
  return (node) => {
    const panel = node as HTMLElement;

    let startY = 0;
    let offset = 0;
    let dragging = false;
    let closing = false;

    const reset = () => {
      dragging = false;
      offset = 0;
      // Clearing the inline styles reverts to the stylesheet values, so the
      // panel either stays put (modal) or animates back (drawer transition).
      panel.style.transform = '';
      panel.style.transition = '';
    };

    /**
     * Slide the panel fully off the bottom of the screen, then invoke
     * `onClose` once the transition lands. Used by panels that remove
     * themselves from the DOM on close, so no style cleanup is needed
     * afterwards — a fresh element is created on the next open.
     */
    const animateOutAndClose = () => {
      closing = true;
      slidePanelOut(panel, offset, () => {
        closing = false;
        getOptions().onClose();
      });
    };

    // --- shared drag lifecycle (used by both the touch and mouse paths) ---

    const beginDrag = (clientY: number) => {
      startY = clientY;
      offset = 0;
      dragging = true;
      // Follow the pointer without animation lag.
      panel.style.transition = 'none';
    };

    const moveDrag = (clientY: number, preventDefault: () => void) => {
      if (!dragging) return;
      const delta = clientY - startY;
      if (delta > 0) {
        preventDefault();
        offset = delta;
        panel.style.transform = `translateY(${offset}px)`;
        const height = panel.offsetHeight || 1;
        getOptions().onProgress?.(Math.min(offset / height, 1));
      } else {
        // Dragging back up: let any scrollable content scroll natively.
        offset = 0;
        panel.style.transform = '';
        getOptions().onProgress?.(0);
      }
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      const opts = getOptions();
      const shouldClose = offset > (opts.threshold ?? 110);
      if (!shouldClose) {
        // Short swipe: snap back to the open position.
        opts.onCancel?.();
        reset();
        return;
      }

      // Committed swipe: let the caller wind down its close-out visuals
      // (e.g. fade the scrim) over the same duration as the panel leaving.
      opts.onCloseStart?.(CLOSE_ANIMATION_MS);

      if (opts.animateOut ?? true) {
        // Slide the panel out ourselves, then close once it lands.
        animateOutAndClose();
      } else {
        // Hand off to the caller's own close mechanism: keep the panel where
        // the pointer left it, restore stylesheet-driven transitions, and let
        // the caller animate the rest from this offset. The caller clears the
        // leftover inline transform once the panel is hidden.
        panel.style.transition = '';
        opts.onClose();
      }
    };

    // --- touch path: drags from anywhere on the panel ---

    const onTouchStart = (e: TouchEvent) => {
      if (closing) return;
      const target = e.target as Element | null;
      if (target?.closest('[data-swipe-ignore]')) return;
      const scrollable = nearestScrollable(target, panel);
      if (scrollable && scrollable.scrollTop > 0) return;
      beginDrag(e.touches[0].clientY);
    };

    // Non-passive so we can preventDefault and stop native overscroll/scroll
    // from competing while the panel is being dragged down.
    const onTouchMove = (e: TouchEvent) => moveDrag(e.touches[0].clientY, () => e.preventDefault());

    const onTouchEnd = () => endDrag();

    const onTouchCancel = () => {
      getOptions().onCancel?.();
      reset();
    };

    // --- mouse path: drags only from the handle ---

    const onMouseMove = (e: MouseEvent) => moveDrag(e.clientY, () => e.preventDefault());

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      endDrag();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (closing) return;
      if (e.button !== 0) return; // left button only
      const target = e.target as Element | null;
      // Only the handle is a mouse drag target, and never an interactive
      // control or explicitly-ignored element within it.
      if (!target?.closest('[data-swipe-handle]')) return;
      if (target.closest('[data-swipe-ignore], button, a, input, select, textarea, label')) return;
      // Prevent text selection and follow the pointer on the window, so the
      // drag keeps tracking even once the cursor leaves the small handle.
      e.preventDefault();
      beginDrag(e.clientY);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    // --- attach/detach, gated on touch capability ---

    const mql = window.matchMedia(COARSE_POINTER_QUERY);
    let listening = false;

    const startListening = () => {
      if (listening) return;
      listening = true;
      panel.addEventListener('touchstart', onTouchStart);
      panel.addEventListener('touchmove', onTouchMove, { passive: false });
      panel.addEventListener('touchend', onTouchEnd);
      panel.addEventListener('touchcancel', onTouchCancel);
      panel.addEventListener('mousedown', onMouseDown);
    };

    const stopListening = () => {
      if (!listening) return;
      listening = false;
      panel.removeEventListener('touchstart', onTouchStart);
      panel.removeEventListener('touchmove', onTouchMove);
      panel.removeEventListener('touchend', onTouchEnd);
      panel.removeEventListener('touchcancel', onTouchCancel);
      panel.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      // Abandon any in-progress drag so the panel doesn't stay offset.
      if (dragging) reset();
    };

    // Re-evaluate when the device's pointer capabilities change (e.g. toggling
    // device emulation in dev tools, or docking/undocking a 2-in-1).
    const onChange = () => (mql.matches ? startListening() : stopListening());

    if (mql.matches) startListening();
    mql.addEventListener('change', onChange);

    return () => {
      mql.removeEventListener('change', onChange);
      stopListening();
    };
  };
}
