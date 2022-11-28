import { httpsCallable, type Functions, type HttpsCallable } from 'firebase/functions';

// TS-TODO: type the function responses in this file

type CreateUserRequest = { firstName: string; lastName: string, countryCode: string };
type email = string;

export let createUser: HttpsCallable<CreateUserRequest> | null = null;
export let requestPasswordReset: HttpsCallable<email> | null = null;
export let resendAccountVerification: HttpsCallable | null = null;

export const initializeFunctions = (functions: Functions) => {
  createUser = httpsCallable<CreateUserRequest>(functions, 'createUser');
  requestPasswordReset = httpsCallable<email>(functions, 'requestPasswordReset');
  resendAccountVerification = httpsCallable(functions, 'resendAccountVerification');
}


