export default (page: { url: { pathname: string } }, route: string) => {
  return page.url.pathname === route;
}
