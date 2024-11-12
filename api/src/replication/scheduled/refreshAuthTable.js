const { auth } = require('../../firebase');
const { supabase } = require('../../supabase');
const { mapAuthUser } = require('../shared');

/**
 * Regularly syncs `lastRefreshTime`, `displayName` and other properties to the Postgres replica's auth table.
 *
 * This property is not available if the firebase-tools auth:export output,
 * but seemingly only in the API.
 */

/**
 * Based on https://firebase.google.com/docs/auth/admin/manage-users#list_all_users
 * @param {*} nextPageToken
 */
const syncUsersStartingFrom = async (nextPageToken) => {
  // List batch of users, 1000 at a time.
  await auth
    .listUsers(1000, nextPageToken)
    .then(async (listUsersResult) => {
      // Upsert details
      if (listUsersResult) {
        await supabase()
          .from('auth')
          .upsert(listUsersResult.users.map((user) => mapAuthUser(user)))
          .select();
      }
      if (listUsersResult.pageToken) {
        // List next batch of users.
        return syncUsersStartingFrom(listUsersResult.pageToken);
      }
      return undefined;
    })
    .catch((error) => {
      console.log('Error listing users:', error);
    });
};

/**
 */
module.exports = async () => {
  await syncUsersStartingFrom();
};
