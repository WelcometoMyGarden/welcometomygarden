import { httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { FIREBASE_WARNING } from './firebase';
import type { EmailPreferences, User } from '$lib/models/User';

// Single ref for the bundle — initialized in initializeEuropeWest1Functions below.
let indexCallableRef: HttpsCallable<{ fn: string; data: unknown }, unknown> | null = null;

const indexCallableAccessor = (): HttpsCallable<{ fn: string; data: unknown }, unknown> | null =>
  indexCallableRef;

/**
 * Routes a call through the indexCallable bundle function.
 * Adds a `fn` discriminator so the backend knows which handler to invoke.
 * The returned function has the same call signature as HttpsCallable<R, S>,
 * making this a drop-in replacement transparent to all callers.
 *
 * The accessor must be a function to prevent concrete `null` values being "hard-coded" into
 * the inner function by Vite.
 */
const wrapCallable = <R = unknown, S = unknown>(fnName: string) => {
  return async (data?: R | null) => {
    const callable = indexCallableAccessor() as HttpsCallable<{ fn: string; data: R }, S> | null;
    if (callable) {
      return await callable({ fn: fnName, data: data as R });
    }
    throw new Error(FIREBASE_WARNING.functions);
  };
};

export type CreateUserRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  countryCode: string;
  communicationLanguage: string;
  reference: string | null;
};
export const createUser = wrapCallable<CreateUserRequest>('createUser');

type email = string;

export const requestPasswordReset = wrapCallable<email>('requestPasswordReset');

export const resendAccountVerification = wrapCallable('resendAccountVerification');

export const requestEmailChange = wrapCallable<email>('requestEmailChange');

export type PropagateEmailChangeRequest = {
  mode: 'change' | 'recover';
  /**
   * The email to change to, or recover to
   */
  email: string;
};
export const propagateEmailChange =
  wrapCallable<PropagateEmailChangeRequest>('propagateEmailChange');

// These are just the fields we're interested in
// https://stripe.com/docs/api/customers/create
type CreateStripeCustomerResponse = {
  id: string;
  object: string;
  description: string;
  name: string;
  metadata: {
    wtmg_id?: string;
  };
};

export const createStripeCustomer = wrapCallable<unknown, CreateStripeCustomerResponse>(
  'createStripeCustomer'
);

// These are just the fields we're interested in
// https://stripe.com/docs/api/customers/create
type CreateCustomerPortalSessionResponse = {
  id: string;
  object: string;
  return_url: string;
  url: string;
};
export const createCustomerPortalSession = wrapCallable<
  unknown,
  CreateCustomerPortalSessionResponse
>('createCustomerPortalSession');

type CreateOrRetrieveUnpaidSubscriptionRequest = {
  /** Price ID of the subscription to create */
  priceId: string;
  /** ISO 639-1 locale that the Stripe subscription-related flow should be localized in. */
  locale: string;
};

type CreateOrRetrieveUnpaidSubscriptionResponse = {
  subscriptionId: string;
  /** Payment intent client secret for the first invoice,
   * can be used to load a Stripe embedded payment module
   */
  clientSecret: string;
};

export const createOrRetrieveUnpaidSubscription = wrapCallable<
  CreateOrRetrieveUnpaidSubscriptionRequest,
  CreateOrRetrieveUnpaidSubscriptionResponse
>('createOrRetrieveUnpaidSubscription');

export type DiscourseConnectLoginRequest = {
  /**
   * Payload
   */
  sso: string;
  sig: string;
};

export type DiscourseConnectLoginResponse = DiscourseConnectLoginRequest & {
  return_sso_url: string;
};

export const discourseConnectLogin = wrapCallable<
  DiscourseConnectLoginRequest,
  DiscourseConnectLoginResponse
>('discourseConnectLogin');

// To manage SendGrid subscriptions
export type ManageEmailPreferencesRequest = {
  email: string;
  secret?: string;
} & (
  | {
      type: 'get';
    }
  | {
      type: 'set';
      // For now, this is whether the user should be subscribed to the newsletter or not
      emailPreferences: EmailPreferences;
    }
);

export type ManageEmailPreferencesResponse =
  | {
      status: 'ok';
      emailPreferences: EmailPreferences;
    }
  | { status: 'error'; error: string };

export const manageEmailPreferences = wrapCallable<
  ManageEmailPreferencesRequest,
  ManageEmailPreferencesResponse
>('manageEmailPreferences');

export const initializeEuropeWest1Functions = (europeWest1Functions: Functions) => {
  indexCallableRef = httpsCallable(europeWest1Functions, 'indexCallable');
};
