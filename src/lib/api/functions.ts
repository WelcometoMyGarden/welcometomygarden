import { httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { FIREBASE_WARNING } from './firebase';

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

type CreateUserRequest = { firstName: string; lastName: string; countryCode: string };
let createUserRef: HttpsCallable<CreateUserRequest> | null = null;
export const createUser: HttpsCallable<CreateUserRequest> = wrapCallable(() => createUserRef);

type email = string;
let requestPasswordResetRef: HttpsCallable<email> | null = null;
export const requestPasswordReset: HttpsCallable<email> = wrapCallable(
  () => requestPasswordResetRef
);
let resendAccountVerificationRef: HttpsCallable | null = null;
export const resendAccountVerification: HttpsCallable = wrapCallable(
  () => resendAccountVerificationRef
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

export const initializeUsCentral1Functions = (usCentral1Functions: Functions) => {
  createUserRef = httpsCallable<CreateUserRequest>(usCentral1Functions, 'createUser');
  requestPasswordResetRef = httpsCallable<email>(usCentral1Functions, 'requestPasswordReset');
  resendAccountVerificationRef = httpsCallable(usCentral1Functions, 'resendAccountVerification');
};

export const initializeEuropeWest1Functions = (europeWest1Functions: Functions) => {
  createStripeCustomerRef = httpsCallable(europeWest1Functions, 'createStripeCustomer');
  createOrRetrieveUnpaidSubscriptionRef = httpsCallable(
    europeWest1Functions,
    'createOrRetrieveUnpaidSubscription'
  );
  createCustomerPortalSessionRef = httpsCallable(
    europeWest1Functions,
    'createCustomerPortalSession'
  );
};
