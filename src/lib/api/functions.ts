import { httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { FIREBASE_WARNING } from './firebase';

// TS-TODO: type the function responses in this file

type CreateUserRequest = { firstName: string; lastName: string; countryCode: string };
type email = string;

// And more fields, thers are just the ones we're interested in
// https://stripe.com/docs/api/customers/create
type CreateStripeCustomerResponse = {
  id: string,
  object: string,
  description: string,
  name: string,
  metadata: {
    wtmg_id?: string
  }
}

type CreateOrRetrieveUnpaidSubscriptionRequest = {
  // Price ID of the subscription to create
  priceId: string
}

type CreateOrRetrieveUnpaidSubscriptionResponse = {
  subscriptionId: string,
  // Payment intent client secret for the first invoice,
  // can be used to load a Stripe embedded payment module
  clientSecret: string
}

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

let createUserRef: HttpsCallable<CreateUserRequest> | null = null;
export const createUser: HttpsCallable<CreateUserRequest> = wrapCallable(() => createUserRef);

let requestPasswordResetRef: HttpsCallable<email> | null = null;
export const requestPasswordReset: HttpsCallable<email> = wrapCallable(
  () => requestPasswordResetRef
);
let resendAccountVerificationRef: HttpsCallable | null = null;
export const resendAccountVerification: HttpsCallable = wrapCallable(
  () => resendAccountVerificationRef
);


let createStripeCustomerRef: HttpsCallable<unknown, CreateStripeCustomerResponse> | null = null;
export const createStripeCustomer: HttpsCallable<unknown, CreateStripeCustomerResponse> = wrapCallable(
  () => createStripeCustomerRef
);

let createOrRetrieveUnpaidSubscriptionRef: HttpsCallable<CreateOrRetrieveUnpaidSubscriptionRequest, CreateOrRetrieveUnpaidSubscriptionResponse> | null = null;
export const createOrRetrieveUnpaidSubscription: HttpsCallable<CreateOrRetrieveUnpaidSubscriptionRequest, CreateOrRetrieveUnpaidSubscriptionResponse> = wrapCallable(
  () => createOrRetrieveUnpaidSubscriptionRef
);

export const initializeFunctions = (functions: Functions) => {
  createUserRef = httpsCallable<CreateUserRequest>(functions, 'createUser');
  requestPasswordResetRef = httpsCallable<email>(functions, 'requestPasswordReset');
  resendAccountVerificationRef = httpsCallable(functions, 'resendAccountVerification');
  createStripeCustomerRef = httpsCallable(functions, 'createStripeCustomer')
  createOrRetrieveUnpaidSubscriptionRef = httpsCallable(functions, 'createOrRetrieveUnpaidSubscription')
};
