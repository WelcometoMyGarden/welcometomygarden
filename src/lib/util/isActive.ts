export const isActive = (page: { url: { pathname: string } }, route: string) => {
  return page.url.pathname === route;
};

export const isActiveContains = (page: { url: { pathname: string } }, route: string) => {
  return page.url.pathname.includes(route);
};
