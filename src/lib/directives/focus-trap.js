/**
 * Will trap the focus (TAB or SHIFT+TAB) in the current node.
 * No event is dispatched.
 */
export default (node) => {
  const handleKeydown = (e) => {
    trapFocus(node, e);
  };

  window.addEventListener('keydown', handleKeydown);

  return {
    destroy() {
      window.removeEventListener('keydown', handleKeydown);
    }
  };
};

const trapFocus = (node, e) => {
  const tabbable = ':not([disabled]):not([tabindex = "-1"])';
  if (e.key !== 'Tap' && e.keyCode !== 9) return;
  let focusableElts = Array.from(
    node.querySelectorAll(
      `a[href]${tabbable}, area[href]${tabbable},input${tabbable}, select${tabbable}, textarea${tabbable}, button${tabbable}, iframe, [contenteditable=true]${tabbable}, *[tabindex]${tabbable}`
    )
  );

  let index = focusableElts.indexOf(document.activeElement);
  index = switchFocus(focusableElts.length, index, e.shiftKey);

  if (index === -1) return;
  focusableElts[index].focus();
  e.preventDefault();
};

const switchFocus = (size, index, shiftKey) => {
  if (index !== -1 && index !== 0 && index !== size - 1) return -1;
  if (shiftKey && index === 0) return size - 1;
  if ((!shiftKey && index === size - 1) || index === -1) return 0;
  return -1;
};
