import { functions } from './index';

export const createUser = functions.httpsCallable('createUser');
export const requestPasswordReset = functions.httpsCallable('requestPasswordReset');
export const resendAccountVerification = functions.httpsCallable('resendAccountVerification');
