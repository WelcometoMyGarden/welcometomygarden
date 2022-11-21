import { functions } from './firebase';

import { httpsCallable } from 'firebase/functions';

// https://firebase.google.com/docs/functions/callable#call_the_function
export const createUser = httpsCallable(functions, 'createUser');
export const requestPasswordReset = httpsCallable(functions, 'requestPasswordReset');
export const resendAccountVerification = httpsCallable(functions, 'resendAccountVerification');
