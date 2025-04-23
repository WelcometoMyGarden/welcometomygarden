/**
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

const { logger } = require('firebase-functions/v2');
const { auth } = require('../firebase');
const { mapAuthUser } = require('../replication/shared');
const { supabase } = require('../supabase');
const { shouldReplicateRuntime } = require('../sharedConfig');

/**
 * Cloud Function handler intended to run on a Firebase Auth user creation event:
 * https://firebase.google.com/docs/reference/functions/firebase-functions.auth.userbuilder.md#authuserbuilderoncreate
 * @param {UserRecord} user
 */
module.exports = async (user) => {
  // These operations are run in parallel because we don't care (yet) about storing Firebase claims in Supabase.
  await Promise.all([
    (async () => {
      try {
        // Note: in the auth user creation event, user.displayName will be null!
        if (shouldReplicateRuntime()) {
          await supabase().from('auth').upsert(mapAuthUser(user)).select();
        }
      } catch (error) {
        logger.error('Error upserting auth user to supabase', { user: user.toJSON(), error });
      }
    })(),
    (async () => {
      try {
        // Set custom user claims on this newly created user.
        await auth.setCustomUserClaims(user.uid, {
          role: 'authenticated'
        });
      } catch (error) {
        logger.error('Error setting custom claims for a new user', { user: user.toJSON(), error });
      }
    })()
  ]);
};
