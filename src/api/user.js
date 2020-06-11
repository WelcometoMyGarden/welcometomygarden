import { db } from './index';

export const getPublicUserProfile = async (uid) => {
  const user = await db.collection('users').doc(uid).get();
  if (!user.exists) throw new Error('This person does not have an account.');
  return user.data();
};
