// TODO: the usage of the two functions in this file should probably mostly be refactored.
// We now have a simpler, hopefully more accurate and richer expression of the active route in
// getCurrentRoute in src/lib/routes.ts
// see https://www.reddit.com/r/sveltejs/comments/qx95ge/comment/j8hpvb4/?utm_source=share&utm_medium=web2x&context=3

export const isActive = (page: { url: { pathname: string } }, route: string) => {
  return page.url.pathname === route;
};

export const isActiveContains = (page: { url: { pathname: string } }, route: string) => {
  return page.url.pathname.includes(route);
};
