import { httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { FIREBASE_WARNING } from './firebase';
import type { EmailPreferences, User } from '$lib/models/User';

/**
 * Checks whether the Firebase function is initialized before calling it, while keeping
 * strong TS typing.
 *
 * The accessor must be a function to prevent concrete `null` values being "hard-coded" into
 * the inner function by Vite.
 */
const wrapCallable = <R, S>(callableAccessor: () => HttpsCallable<R, S> | null) => {
  // This function matches the internal signature of HttpsCallable
  return async (data?: R | null) => {
    const callable = callableAccessor();
    if (callable) {
      return await callable(data);
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
let createUserRef: HttpsCallable<CreateUserRequest> | null = null;
export const createUser: HttpsCallable<CreateUserRequest> = wrapCallable(() => createUserRef);

type email = string;
type EmptyObject = Record<string, never>;

let requestPasswordResetRef: HttpsCallable<email> | null = null;
export const requestPasswordReset: HttpsCallable<email> = wrapCallable(
  () => requestPasswordResetRef
);

let resendAccountVerificationRef: HttpsCallable | null = null;
export const resendAccountVerification: HttpsCallable = wrapCallable(
  () => resendAccountVerificationRef
);

let requestEmailChangeRef: HttpsCallable<email> | null = null;
export const requestEmailChange: HttpsCallable<email> = wrapCallable(() => requestEmailChangeRef);

export type PropagateEmailChangeRequest = {
  mode: 'change' | 'recover';
  /**
   * The email to change to, or recover to
   */
  email: string;
};
let propagateEmailChangeRef: HttpsCallable<PropagateEmailChangeRequest> | null = null;
export const propagateEmailChange: HttpsCallable<PropagateEmailChangeRequest> = wrapCallable(
  () => propagateEmailChangeRef
);

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
let createStripeCustomerRef: HttpsCallable<unknown, CreateStripeCustomerResponse> | null = null;
export const createStripeCustomer: HttpsCallable<unknown, CreateStripeCustomerResponse> =
  wrapCallable(() => createStripeCustomerRef);

// These are just the fields we're interested in
// https://stripe.com/docs/api/customers/create
type CreateCustomerPortalSessionResponse = {
  id: string;
  object: string;
  return_url: string;
  url: string;
};
let createCustomerPortalSessionRef: HttpsCallable<
  unknown,
  CreateCustomerPortalSessionResponse
> | null = null;

export const createCustomerPortalSession: HttpsCallable<
  unknown,
  CreateCustomerPortalSessionResponse
> = wrapCallable(() => createCustomerPortalSessionRef);

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

let createOrRetrieveUnpaidSubscriptionRef: HttpsCallable<
  CreateOrRetrieveUnpaidSubscriptionRequest,
  CreateOrRetrieveUnpaidSubscriptionResponse
> | null = null;
export const createOrRetrieveUnpaidSubscription: HttpsCallable<
  CreateOrRetrieveUnpaidSubscriptionRequest,
  CreateOrRetrieveUnpaidSubscriptionResponse
> = wrapCallable(() => createOrRetrieveUnpaidSubscriptionRef);

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

let discourseConnectLoginRef: HttpsCallable<
  DiscourseConnectLoginRequest,
  DiscourseConnectLoginResponse
> | null = null;
export const discourseConnectLogin: HttpsCallable<
  DiscourseConnectLoginRequest,
  DiscourseConnectLoginResponse
> = wrapCallable(() => discourseConnectLoginRef);

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
let manageEmailPreferencesRef: HttpsCallable<
  ManageEmailPreferencesRequest,
  ManageEmailPreferencesResponse
> | null = null;
export const manageEmailPreferences: HttpsCallable<
  ManageEmailPreferencesRequest,
  ManageEmailPreferencesResponse
> = wrapCallable(() => manageEmailPreferencesRef);

export const initializeEuropeWest1Functions = (europeWest1Functions: Functions) => {
  createUserRef = httpsCallable<CreateUserRequest>(europeWest1Functions, 'createUserV2');
  //@ts-ignore
  requestPasswordResetRef = httpsCallable<EmptyObject>(
    europeWest1Functions,
    'requestPasswordResetV2'
  );
  resendAccountVerificationRef = httpsCallable(europeWest1Functions, 'resendAccountVerificationV2');
  createStripeCustomerRef = httpsCallable(europeWest1Functions, 'createStripeCustomerV2');
  createOrRetrieveUnpaidSubscriptionRef = httpsCallable(
    europeWest1Functions,
    'createOrRetrieveUnpaidSubscriptionV2'
  );
  createCustomerPortalSessionRef = httpsCallable(
    europeWest1Functions,
    'createCustomerPortalSessionV2'
  );
  // temporarily unused
  // createCustomerPortalSessionRef = httpsCallable(
  //   europeWest1Functions,
  //   'createCustomerPortalSessionV2'
  // );
  discourseConnectLoginRef = httpsCallable(europeWest1Functions, 'discourseConnectLoginV2');
  requestEmailChangeRef = httpsCallable(europeWest1Functions, 'requestEmailChangeV2');
  propagateEmailChangeRef = httpsCallable(europeWest1Functions, 'propagateEmailChangeV2');
  manageEmailPreferencesRef = httpsCallable(europeWest1Functions, 'manageEmailPreferencesV2');
};
