import { httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';
import { FIREBASE_WARNING } from './firebase';

// TS-TODO: type the function responses in this file

type CreateUserRequest = { firstName: string; lastName: string, countryCode: string };
type email = string;

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
    const callable = callableAccessor()
    if (callable) {
      return await callable(data)
    }
    throw new Error(FIREBASE_WARNING.functions)
  }
}

let createUserRef: HttpsCallable<CreateUserRequest> | null = null;
export const createUser: HttpsCallable<CreateUserRequest> = wrapCallable(() => createUserRef)

let requestPasswordResetRef: HttpsCallable<email> | null = null;
export const requestPasswordReset: HttpsCallable<email> = wrapCallable(() => requestPasswordResetRef)
let resendAccountVerificationRef: HttpsCallable | null = null;
export const resendAccountVerification: HttpsCallable = wrapCallable(() => resendAccountVerificationRef);

export const initializeFunctions = (functions: Functions) => {
  createUserRef = httpsCallable<CreateUserRequest>(functions, 'createUser');
  requestPasswordResetRef = httpsCallable<email>(functions, 'requestPasswordReset');
  resendAccountVerificationRef = httpsCallable(functions, 'resendAccountVerification');
}
