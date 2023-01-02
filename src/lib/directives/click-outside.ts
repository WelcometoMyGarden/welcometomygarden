export type ClickOutsideParams = {
  clickEvent: PointerEvent | MouseEvent;
  node: Node;
};

export type ClickOutsideEvent = CustomEvent<ClickOutsideEvent>;

/* Dispatch event on click outside of dom node */
export default (node: Node) => {
  const handleClick = (event: PointerEvent | MouseEvent) => {
    if (node && event.target && !node.contains(event.target as Node) && !event.defaultPrevented) {
      node.dispatchEvent(
        new CustomEvent<ClickOutsideParams>('click-outside', {
          detail: { clickEvent: event, node }
        })
      );
    }
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    }
  };
};
