import type { LayoutLoad } from "./$types";
export const prerender = true;
export const ssr = false;

// See https://kit.svelte.dev/docs/load#layout-data
export const load: LayoutLoad = function load({ params }) {
  return { params: params };
}
