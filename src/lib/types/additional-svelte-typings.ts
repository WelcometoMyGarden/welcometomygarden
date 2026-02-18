// See https://svelte.dev/docs/svelte/typescript#Enhancing-built-in-DOM-types

declare module 'svelte/elements' {
  // add a new global attribute that is available on all html elements
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
   * Short commit hash of the codebase, with a -dirty suffix if files were modified
   */
  const __COMMIT_HASH__: string;
  /**
   *
    committer date, ISO 8601-like format
   */
  const __COMMIT_DATE__: string;
  const __BUILD_DATE__: string;
}

export {}; // ensure this is not an ambient module, else types will be overridden instead of augmented
