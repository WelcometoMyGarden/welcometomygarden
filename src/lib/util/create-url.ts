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
  queryParams: Record<string, string | number | boolean> = {},
  hash?: string
) => {
  const searchParams = new URLSearchParams(mapValues(queryParams, (v) => v.toString()));
  return `${base}${isEmpty(queryParams) ? '' : `?${searchParams.toString()}`}${
    hash ? `#${hash}` : ''
  }`;
};
