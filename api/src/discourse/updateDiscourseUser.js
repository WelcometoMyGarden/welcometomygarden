const { defineString } = require('firebase-functions/params');
// See https://stackoverflow.com/a/70139151/4973029
const { default: fetch, Headers } = require('node-fetch');
const { getHmacDigest } = require('./discourseConnectLogin');

const discourseHostParam = defineString('DISCOURSE_HOST', { default: '' });
const discourseApiKeyParam = defineString('DISCOURSE_API_KEY', { default: '' });

/**
 * Updates the email of a connected Discourse user, if one exists.
 *
 * Should only be called when the target email of the user is verified
 * @param {UserRecord} user - the user's new auth details
 * @returns {Promise<boolean>} - whether a change occurred
 */
exports.updateDiscourseUser = async (user) => {
  const HOST = discourseHostParam.value();
  const API_KEY = discourseApiKeyParam.value();

  if (!HOST || !API_KEY) {
    console.warn(
      'No Discourse HOST & API_KEY variables are configured. Skipping Discourse user email update.'
    );
    return false;
  }
  const { uid, email } = user;
  if (!email) {
    console.error(`Discourse update asked for ${uid}, but email was falsy`);
    return false;
  }
  //
  // 1. Find the if the user with the Firebase UID (external_id) already exists in Discourse

  const headers = new Headers(
    /**
     * @type {Record<string, string>}
     */ ({
      // for the sync_sso route, this needs to be a 'Global' (read/write)-scoped key.
      'Api-Key': API_KEY,
      'Api-Username': 'system',
      'Content-Type': 'application/json'
    })
  );

  const existingDiscourseUserResponse = await fetch(`${HOST}/u/by-external/${uid}.json`, {
    headers
  });
  if (existingDiscourseUserResponse.status < 200 || existingDiscourseUserResponse.status > 299) {
    // Non-successful response => this uid is not a Discourse user yet.
    // We expect a 404 in this case.
    if (existingDiscourseUserResponse.status === 404) {
      console.info(
        `Tried to change the Discourse email of uid ${uid}, but this user is not in Discourse yet`
      );
    } else {
      console.warn(
        `Unexpected error when trying to fetch a Discourse user by their external id (uid: ${uid})`,
        await existingDiscourseUserResponse.text()
      );
    }
    // We don't have to perform an update.
    return false;
  }

  // 2. Update the existing user
  // See https://meta.discourse.org/t/sync-discourseconnect-user-data-with-the-sync-sso-route-javascript/260841

  console.log(`Updating the email of existing Discourse, uid ${uid}`);

  const ssoRecord = new URLSearchParams({
    external_id: uid,
    email
    // Don't change the username
    // activation not required, this should only be called when the email is verified
  }).toString();

  const ssoPayload = Buffer.from(ssoRecord, 'utf8').toString('base64');
  const signature = getHmacDigest(ssoPayload);

  await fetch(`${HOST}/admin/users/sync_sso`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sso: ssoPayload, sig: signature })
  }).then((r) => r.json());

  return true;
};
