import { page } from '$app/stores';
import { derived, get, type Readable } from 'svelte/store';

type RouteDescription = {
  route: string;
  requiresAuth: boolean;
};

export const routeDescriptions = {
  ACCOUNT: { route: '/account', requiresAuth: true },
  ADD_GARDEN: { route: '/garden/add', requiresAuth: true },
  ABOUT_MEMBERSHIP: { route: '/about-membership', requiresAuth: false },
  ABOUT_US: { route: '/about-us', requiresAuth: false },
  AUTH_ACTION: { route: '/auth/action', requiresAuth: false },
  AUTH_DISCOURSE: { route: '/auth/discourse-connect', requiresAuth: true },
  BECOME_MEMBER: { route: '/become-member', requiresAuth: false },
  CHAT: { route: '/chat', requiresAuth: false },
  COOKIE_POLICY: { route: '/terms/cookies', requiresAuth: false },
  FAQ: { route: '/info/faq', requiresAuth: false },
  HOME: { route: '/', requiresAuth: false },
  MANAGE_GARDEN: { route: '/garden/manage', requiresAuth: true },
  MAP: { route: '/explore', requiresAuth: false },
  PRIVACY_POLICY: { route: '/terms/privacy-policy', requiresAuth: false },
  REGISTER: { route: '/register', requiresAuth: false },
  REQUEST_PASSWORD_RESET: { route: '/request-password-reset', requiresAuth: false },
  RESET_PASSWORD: { route: '/reset-password', requiresAuth: false },
  RULES: { route: '/info/rules', requiresAuth: false },
  SIGN_IN: { route: '/sign-in', requiresAuth: false },
  MEMBER_PAYMENT: { route: '/become-member/payment', requiresAuth: true },
  // This is actually a stateless page, fully instantiated by its query params
  APP_PAYMENT: { route: '/app-payment', requiresAuth: false },
  TERMS_OF_USE: { route: '/terms/terms-of-use', requiresAuth: false },
  MEMBER_THANK_YOU: { route: '/become-member/thank-you', requiresAuth: false },
  ROUTE_PLANNER: { route: '/routeplanner', requiresAuth: false }
} satisfies { [key: string]: RouteDescription };

type RouteDescriptions = {
  [property in keyof typeof routeDescriptions]: RouteDescription;
};

/**
 *
 * Converts a SvelteKit route ID to a form that removes optional route segments ( /[segment]/ ), and route groups ( /(group)/ ).
 * @param routeId
 */
export const visibleRoute = (routeId: string) =>
  routeId
    .split('/')
    .filter((s) => !/^\[\[.*\]\]$|^\(.*\)$/.test(s))
    .join('/');

/**
 * Finds the longest recorded base route (description) that is included in the given path
 * Examples:
 *   /become-member/payment   is included in      /[[lang]]/(stateful)/become-member/payment
 *   /explore/garden/         is included in      /es/explore/garden/128dsafd8sdasegea
 * @param path
 * @returns
 */
const findRouteMatch = (path: string) => {
  // Find the route descriptions that appear in the given route

  const candidates = Object.entries(routeDescriptions).filter(([, v]) => path.includes(v.route));

  // Pick the longest matching candidate route description
  const finalCandidate = candidates.reduce(
    (finalRoute, currentRoute) =>
      currentRoute[1].route.length > finalRoute[1].route.length ? currentRoute : finalRoute,
    ['', { route: '', requiresAuth: false }] as [string, RouteDescription]
  );
  // If it has a route name, we found a candidate
  if (finalCandidate[0]) {
    return finalCandidate[1];
  }
  return null;
};

/**
 * Gets the currently active route from the set of constant routeDescriptions maintained in this file.
 * Note that the routes here are not exhaustive. In reality, routes such as /explore/garden/<id> exist, while those are not mentioned here.
 * The routeDescription only mentions a subset of the possible routes.
 */
const getCurrentRouteDescriptionInner = (
  localPage: typeof page extends Readable<infer Y> ? Y : never
) => {
  // Note that route.id also includes named groups and optional parameters,
  // such as /[[lang]]/(stateful)/become-member/payment
  if (localPage && localPage.route && localPage.route.id) {
    // We will have several candidates for routes, because all routes match '/', and
    // /become-member/payment matches /become-member as well
    //
    // Find the route descriptions that appear in the current SvelteKit route id
    return findRouteMatch(visibleRoute(localPage.route.id));
  }
  return null;
};

/**
 * Get the non-localized base route of the given SvelteKit route ID or concrete pathname
 *
 * This is a version of getCurrentRoute() for the given route id or path
 */
export const getBaseRouteIn = (path: string) => findRouteMatch(visibleRoute(path))?.route;

export const getCurrentRouteDescription = () => getCurrentRouteDescriptionInner(get(page));

/**
 * Convenience method that gets a current route string without access information
 */
export const getCurrentRoute = () => getCurrentRouteDescription()?.route;

export const currentRouteDescription = derived(page, ($page) =>
  getCurrentRouteDescriptionInner($page)
);
export const currentRoute = derived(page, ($page) => getCurrentRouteDescriptionInner($page)?.route);

export const activeUnlocalizedPath = derived(page, ($page) =>
  $page?.url?.pathname?.substring($page.params.lang ? 3 : 0)
);

/**
 * Selects the root path segment without localization and leading slash
 */
// In case of a non-default lang parameter, a 2-char iso code will be present (/nl/)
// in the path => strip the first 4 chars.
export const activeRootPath = derived(
  page,
  ($page) => $page?.url?.pathname?.substring($page.params.lang ? 4 : 1).split('/')[0]
);

/**
 * Strip a 2-character langugage path parth like nl/ from the URL, without modifying the url for the rest.
 * Also works with home page URLs like /es without, without trailing slash
 *
 * This is a generic version of activeUnlocalizedPath above, applicable to any given relative path.
 */
export const unlocalizePath = (path: string) => path.replace(/(?<=^\/)[a-z]{2}(?=\/|$)\/?/, '');

export const routeNames = Object.fromEntries(
  Object.entries(routeDescriptions).map(([k, v]) => [k, v.route])
) as unknown as {
  [property in keyof RouteDescriptions]: string;
};

export default routeNames;
