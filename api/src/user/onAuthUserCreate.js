/**
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

const { logger } = require('firebase-functions/v2');
const { mapAuthUser } = require('../replication/shared');
const { supabase } = require('../supabase');
const { shouldReplicateRuntime } = require('../sharedConfig');

/**
 * Cloud Function handler intended to run on a Firebase Auth user creation event:
 * https://firebase.google.com/docs/reference/functions/firebase-functions.auth.userbuilder.md#authuserbuilderoncreate
 * @param {UserRecord} user
 */
module.exports = async (user) => {
  try {
    // Note: in the auth user creation event, user.displayName will be null!
    if (shouldReplicateRuntime()) {
      await supabase().from('auth').upsert(mapAuthUser(user)).select();
    }
  } catch (error) {
    logger.error('Error upserting auth user to supabase', { user: user.toJSON(), error });
  }
};
