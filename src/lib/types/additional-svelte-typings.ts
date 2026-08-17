// See https://svelte.dev/docs/svelte/typescript#Enhancing-built-in-DOM-types

declare module 'svelte/elements' {
  // add a new global attribute that is available on all html elements
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- `T` must match Svelte's HTMLAttributes<T> signature for declaration merging
  export interface HTMLAttributes<T> {
    onclickoutside?: (event: CustomEvent) => void;
  }
}

// These are general global ambient types
declare global {
  // Types of Vite Define constants
  // taking the role of vite-env.d.ts
  // Can be resolved in Svelte files/templates too.

  /**
   * Short commit hash of the codebase
   */
  const __COMMIT_HASH__: string;
  /**
   * The first line of the commit message
   */
  const __COMMIT_MESSAGE__: string;
  /**
   *
    committer date, ISO 8601-like format
   */
  const __COMMIT_DATE__: string;
  const __BUILD_DATE__: string;
}

export {}; // ensure this is not an ambient module, else types will be overridden instead of augmented
