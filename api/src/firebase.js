const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const db = getFirestore();
exports.db = db;
const auth = getAuth();
exports.auth = auth;

/**
 * @template T
 * @param {DocumentSnapshot<T>} d
 * @returns {T}
 */
exports.toFirebaseData = (d) => d.data();

/**
 * Convenience method, see also `getUserDocRefsWithData`
 * @param {string} uid
 */
exports.getUserDocRefs = (uid) => {
  const privateUserProfileDocRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.doc(`users-private/${uid}`)
  );
  const publicUserProfileDocRef = /** @type {DocumentReference<UserPublic>} */ (
    db.doc(`users/${uid}`)
  );
  return { privateUserProfileDocRef, publicUserProfileDocRef };
};

/**
 * Convenience method
 * @param {string} uid
 * @returns
 */
exports.getUserDocRefsWithData = async (uid) => {
  const { privateUserProfileDocRef, publicUserProfileDocRef } = this.getUserDocRefs(uid);
  const [privateUserProfileData, publicUserProfileData] = await Promise.all([
    privateUserProfileDocRef.get().then(this.toFirebaseData),
    publicUserProfileDocRef.get().then(this.toFirebaseData)
  ]);
  return {
    privateUserProfileDocRef,
    publicUserProfileDocRef,
    privateUserProfileData,
    publicUserProfileData
  };
};
