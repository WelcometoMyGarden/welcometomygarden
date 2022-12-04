export const prerender = true;
export const ssr = false;

// See https://kit.svelte.dev/docs/load#layout-data
export function load({ params }) {
  return { params: params };
}
