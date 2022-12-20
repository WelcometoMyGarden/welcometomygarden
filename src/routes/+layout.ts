import type { LayoutLoad } from './$types';
// Prerender on the root layout: default SSG for the whole app.
export const prerender = true;
export const ssr = false;

// See https://kit.svelte.dev/docs/load#layout-data
export const load: LayoutLoad = function load({ params }) {
  return { params: params };
};
