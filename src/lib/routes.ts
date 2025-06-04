import { page } from '$app/stores';
import { get } from 'svelte/store';

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
  TERMS_OF_USE: { route: '/terms/terms-of-use', requiresAuth: false },
  MEMBER_THANK_YOU: { route: '/become-member/thank-you', requiresAuth: false }
};

// Note, this otherwise useless expression allows us to typecheck the above array.
// I don't want to assign a generic [key: string] type to it directly,
// because we derive a type of its concrete keys below with RouteDescriptions, and it does not
// seem to be possible reference a object with 'typeof' in its own declaration.
// This helps with catching type errors above.
routeDescriptions as { [key: string]: RouteDescription };

type RouteDescriptions = {
  [property in keyof typeof routeDescriptions]: RouteDescription;
};

/**
 * Gets the currently active route from the set of constant routeDescriptions maintained in this file.
 * Note that the routes here are not exhaustive. In reality, routes such as /explore/garden/<id> exist, while those are not mentioned here.
 * The routeDescription only mentions a subset of the possible routes.
 */
export const getCurrentRoute = () => {
  const localPage = get(page);
  // Note that route.id also includes named groups, such as /(stateful)/become-member/payment
  if (localPage && localPage.route.id) {
    // We will have several candidates for routes, because all routes match '/', and
    // /become-member/payment matches /become-member as well
    //
    // Find the route descriptions that appear in the current SvelteKit route id
    const candidates = Object.entries(routeDescriptions).filter(([, v]) =>
      localPage.route.id?.includes(v.route)
    );

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
  }
  return null;
};

export const routeNames = Object.fromEntries(
  Object.entries(routeDescriptions).map(([k, v]) => [k, v.route])
) as unknown as {
  [property in keyof RouteDescriptions]: string;
};

export default routeNames;
