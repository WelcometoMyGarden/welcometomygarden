import { mapValues } from 'lodash-es';

/**
 * @param base the URL + path, excluding query parameters
 */
export default (base: string, queryParams: Record<string, string | number | boolean>) => {
  const searchParams = new URLSearchParams(mapValues(queryParams, (v) => v.toString()));
  return `${base}?${searchParams.toString()}`;
};
