/* Dispatch event on click outside of dom node */
export default (node, disableOnModal = true) => {
  const handleClick = (event) => {
    if (disableOnModal && document.body.hasAttribute('data-modal')) return;
    if (node && !node.contains(event.target) && !event.defaultPrevented) {
      node.dispatchEvent(new CustomEvent('click-outside', { detail: { clickEvent: event, node } }));
    }
  };

  document.addEventListener('click', handleClick, true);

  return {
    destroy() {
      document.removeEventListener('click', handleClick, true);
    }
  };
};
