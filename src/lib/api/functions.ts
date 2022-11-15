import { functions } from './firebase';

import { httpsCallable } from 'firebase/functions';

export const createUser = httpsCallable(functions, 'createUser');
export const requestPasswordReset = httpsCallable(functions, 'requestPasswordReset');
export const resendAccountVerification = httpsCallable(functions, 'resendAccountVerification');
