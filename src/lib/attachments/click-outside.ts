import type { Attachment } from 'svelte/attachments';

// Note: this custom event is typed in app.d.ts

export type ClickOutsideParams = {
  clickEvent: PointerEvent | MouseEvent;
  node: Node;
};

export type ClickOutsideEvent = CustomEvent<ClickOutsideParams>;

/**
 * This was added to fix one observed issue: if signed in as a non-member, and  the GardenDrawer
 * and ZoomRestrictionNotice are both open, and you click the "become member"
 * link on the notice, then previously both the notice and drawer would close. A breakdown:
 * 1. this attachment captured the outside click of the drawer. It immediately fired the onclickoutside
 *    -> onclose -> async goto(routes.MAP) reset (which would close the garden modal)
 * 2. in the bubble phase, the (default-preventing) click on the notice's
 *    <Anchor> leads to a shallow routing call (pushState) for the membership modal. This briefly opens the modal (a UI flash).
 * 3. the async goto() from (1) resolves, which resets the page state and closes all modals after milliseconds.
 *
 * This is unexpected, we want the membership modal to open on top of the garden modal.
 *
 * One workaround we tried is to track outside clicks here in the capture phase, and dispatch the clickoutside event only
 * in the bubble phase. Basically, respect the pre-existing !event.defaultPrevented condition. However, this *also* leads
 * to unexpected behavior: garden clicks suddenly need to call preventDefault, otherwise the
 * clickoutside will dispatch *after* the navigation to the new garden: the newly clicked garden closes.
 *   Currently, the clickoutside dispatches before the new garden navigation (which leads to 2 navigations, back to /explore and then to the new garden),
 *   which results in a flash, but it also works.
 *   And when calling preventDefault there, the UserDropdown also doesn't close when opening the garden.
 *   There are many dependencies here.
 *
 * So for now, we just filter out this one observed bug scenario.
 */
function isZoomRestrictionLinkWithGardenModalOpen(node: Node) {
  let zoomRestrictionNode = document.querySelector('.zoom-restriction-notice-link');
  let gardenDrawer = document.querySelector('.drawer');
  if (!zoomRestrictionNode || !gardenDrawer) {
    return false;
  }
  return node === zoomRestrictionNode;
}

/* Dispatch event on click outside of dom node */
export default ((node: Node) => {
  const handleClick = (event: PointerEvent | MouseEvent) => {
    if (
      node &&
      event.target &&
      !node.contains(event.target as Node) &&
      // Note: this listens and dispatches clickoutside in the capture phase.
      // event.defaultPrevented called further in the capture phase, or in the bubble phase, will not have an effect,
      // so this condition probably not have an effect, considering document is the DOM root as well.
      !event.defaultPrevented &&
      // This is a hacky exception to prevent a bug, see function docs.
      !isZoomRestrictionLinkWithGardenModalOpen(event.target as Node)
    ) {
      node.dispatchEvent(
        new CustomEvent<ClickOutsideParams>('clickoutside', {
          detail: { clickEvent: event, node }
        })
      );
    }
  };

  document.addEventListener('click', handleClick, true);

  return () => document.removeEventListener('click', handleClick, true);
}) satisfies Attachment;
