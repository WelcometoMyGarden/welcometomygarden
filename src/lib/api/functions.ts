import { functions } from '@/lib/api/firebase';
import { httpsCallable } from 'firebase/functions';

export const createUser = async ({ firstName, lastName, countryCode }: { firstName: string; lastName: string, countryCode: string }) => {
  const createUserCallable = httpsCallable(functions, 'createUser');
  return await createUserCallable({ firstName, lastName, countryCode });
}
export const requestPasswordReset = async (email: string) => {
  const requestPasswordResetCallable = httpsCallable(functions, 'requestPasswordReset');
  return await requestPasswordResetCallable(email);
}
export const resendAccountVerification = async () => {
  const resendAccountVerificationCallable = httpsCallable(functions, 'resendAccountVerification');
  return await resendAccountVerificationCallable();
}
