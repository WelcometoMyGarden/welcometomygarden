/**
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

const { mapAuthUser } = require('../replication/shared');
const supabase = require('../supabase');

/**
 * Cloud Function handler intended to run on a Firebase Auth user creation event:
 * https://firebase.google.com/docs/reference/functions/firebase-functions.auth.userbuilder.md#authuserbuilderoncreate
 * @param {UserRecord} user
 */
module.exports = async (user) => {
  // Note: in the auth user creation event, user.displayName will be null!
  await supabase.from('auth').upsert(mapAuthUser(user)).select();
};
