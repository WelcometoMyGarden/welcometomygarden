// It makes no sense to prerender this page with auth-dependent data.
// SvelteKit also complains if it finds no static link to a page instance
// during prerendering.
export const prerender = false;
