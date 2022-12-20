const enterHandler = (f: () => void) => (e: KeyboardEvent) => {
  // keypress handler to satisfy svelte linter for a11y
  switch (e.key) {
    case 'Enter':
      f();
    // Don't do anything: the on:click will also be called when Enter is pressed
  }
};
export default enterHandler;
