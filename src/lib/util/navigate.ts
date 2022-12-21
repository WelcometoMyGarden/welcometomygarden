import { goto as svelteGoto } from '$app/navigation';

export const goto = (
  path: string,
  opts?: {
    replaceState?: boolean;
    noScroll?: boolean;
    keepFocus?: boolean;
    // This is coming from Svelte types, not on us to fix!
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state?: any;
    invalidateAll?: boolean;
  }
) => {
  svelteGoto(path, opts).catch((e) => {
    console.error('goto error: ', e);
    window.location.href = path;
  });
};
