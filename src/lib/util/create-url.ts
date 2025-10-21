import { isEmpty, mapValues } from 'lodash-es';

export type UTMParameters = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

/**
 * @param base - the URL + path, excluding query parameters
 * @param hash - hash value, without the hash itself
 */
export default (
  base: string,
  queryParams: URLSearchParams | Record<string, string | number | boolean> = {},
  hash?: string
) => {
  let searchParams;
  if (queryParams instanceof URLSearchParams) {
    searchParams = queryParams;
  } else {
    searchParams = new URLSearchParams(mapValues(queryParams, (v) => v.toString()));
  }

  let processedHash;
  if (typeof hash === 'string' && hash[0] === '#') {
    processedHash = hash;
  } else if (typeof hash === 'string') {
    processedHash = `#${hash}`;
  }

  return `${base}${isEmpty(queryParams) ? '' : `?${searchParams.toString()}`}${
    hash ? processedHash : ''
  }`;
};
