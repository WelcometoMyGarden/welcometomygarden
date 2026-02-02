import type { Attachment } from 'svelte/attachments';

// Note: this custom event is typed in app.d.ts

export type ClickOutsideParams = {
  clickEvent: PointerEvent | MouseEvent;
  node: Node;
};

export type ClickOutsideEvent = CustomEvent<ClickOutsideParams>;

/* Dispatch event on click outside of dom node */
export default ((node: Node) => {
  const handleClick = (event: PointerEvent | MouseEvent) => {
    if (node && event.target && !node.contains(event.target as Node) && !event.defaultPrevented) {
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
