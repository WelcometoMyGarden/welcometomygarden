export const prerender = true;
export const ssr = false;

export function load({ params }) {
  return { params: params }
}
