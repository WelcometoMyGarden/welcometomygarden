import type { LayoutLoad } from './$types';

export const load: LayoutLoad = function load({ params }) {
  return {
    params
  };
};
