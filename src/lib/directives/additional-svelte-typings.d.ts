import type { ClickOutsideEvent } from '$lib/directives/click-outside';

// https://github.com/sveltejs/language-tools/blob/master/docs/preprocessors/typescript.md#im-using-an-attributeevent-on-a-dom-element-and-it-throws-a-type-error
// Expose the on:click-outside event to Svelte components
declare namespace svelteHTML {
  // enhance attributes
  interface HTMLAttributes<T> {
    'on:click-outside'?: (event: ClickOutsideEvent) => void;
  }
}
