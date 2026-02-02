import { goto as svelteGoto } from '$app/navigation';
import logger from './logger';

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
) =>
  svelteGoto(path, opts).catch((e) => {
    logger.error('goto error: ', e);
    window.location.href = path;
  });
export const isRelativeURL = (url: string) => {
  // https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
  const absUrlRegex = new RegExp('^(?:[a-z+]+:)?//', 'i');
  return !absUrlRegex.test(url);
};

export const universalGoto = async (url: string) => {
  if (isRelativeURL(url)) {
    return goto(url);
  } else {
    window.location.href = url;
  }
};
