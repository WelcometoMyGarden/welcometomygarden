const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { GoogleAuth } = require('google-auth-library');
const { projectID } = require('firebase-functions/params');

const db = getFirestore();
exports.db = db;
const auth = getAuth();
exports.auth = auth;
let googleAuth;

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

/**
 * Get the URL of a given v2 cloud function.
 * Based on https://firebase.google.com/docs/functions/task-functions?gen=2nd#retrieve-and
 *
 * @param {string} name the function's name
 * @param {string} location the function's location
 * @return {Promise<[string, string]>} The resource name and full URL of the function
 */
exports.getFunctionUrl = async function (name, location = 'europe-west1') {
  const URL_BASE = 'https://cloudfunctions.googleapis.com/v2beta/';
  // googleAuth doesn't seem to work locally in the DEMO emulator firebase-tools@13.28.0 & firebase-admin@^13
  // So in case of the demo- projects, just return the name as the full resource name, this seems to work for queues
  // despite not being documented as such.
  // Other emulator are untested.
  // https://github.com/firebase/firebase-tools/issues/4884#issuecomment-2396998732
  // Also, making regions match - https://github.com/firebase/firebase-tools/issues/8102
  if (projectID.value().startsWith('demo-')) {
    // The URI causes issues
    // `http://127.0.0.1:5001/${projectID}/${location}/${name}`
    return [`locations/${location}/functions/${name}`, null];
  }

  if (!googleAuth) {
    googleAuth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
  }
  const googleAuthProjectId = await googleAuth.getProjectId();
  const resourceName = `projects/${googleAuthProjectId}/locations/${location}/functions/${name}`;
  const url = URL_BASE + resourceName;

  const client = await googleAuth.getClient();
  const res = await client.request({ url });
  const uri = res.data?.serviceConfig?.uri;
  if (!uri) {
    throw new Error(`Unable to retrieve uri for function at ${url}`);
  }
  return [resourceName, uri];
};
