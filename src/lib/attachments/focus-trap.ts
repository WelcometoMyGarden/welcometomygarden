import type { Attachment } from 'svelte/attachments';

/**
 * Will trap the focus (TAB or SHIFT+TAB) in the current node.
 * No event is dispatched.
 */
export default ((node: HTMLElement) => {
  const handleKeydown = (e: KeyboardEvent) => {
    trapFocus(node, e);
  };

  window.addEventListener('keydown', handleKeydown);

  return () => window.removeEventListener('keydown', handleKeydown);
}) satisfies Attachment<HTMLElement>;

const trapFocus = (node: HTMLElement, e: KeyboardEvent) => {
  const tabbable = ':not([disabled]):not([tabindex = "-1"])';
  if (e.key !== 'Tap' && e.keyCode !== 9) return;
  const focusableElts = Array.from(
    node.querySelectorAll<HTMLElement>(
      `a[href]${tabbable}, area[href]${tabbable},input${tabbable}, select${tabbable}, textarea${tabbable}, button${tabbable}, iframe, [contenteditable=true]${tabbable}, *[tabindex]${tabbable}`
    )
  );

  let index = focusableElts.indexOf(document.activeElement as HTMLElement);
  index = switchFocus(focusableElts.length, index, e.shiftKey);

  if (index === -1) return;
  focusableElts[index].focus();
  e.preventDefault();
};

const switchFocus = (size: number, index: number, shiftKey: boolean) => {
  if (index !== -1 && index !== 0 && index !== size - 1) return -1;
  if (shiftKey && index === 0) return size - 1;
  if ((!shiftKey && index === size - 1) || index === -1) return 0;
  return -1;
};
