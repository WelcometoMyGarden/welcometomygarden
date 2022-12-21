import { goto as svelteGoto } from '$app/navigation';

export const goto = (
  path: string,
  opts?: {
    replaceState?: boolean;
    noScroll?: boolean;
    keepFocus?: boolean;
    state?: any;
    invalidateAll?: boolean;
  }
) => {
  svelteGoto(path, opts).catch((e) => {
    console.error('goto error: ', e);
    window.location.href = path;
  });
};
