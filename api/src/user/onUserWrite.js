// @ts-check
const { auth } = require('../firebase');
const {
  sendgrid: sendgridClient,
  SENDGRID_SUPERFAN_FIELD_ID,
  SG_KEY
} = require('../sendgrid/sendgrid');
const fail = require('../util/fail');

/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * @typedef {import("@google-cloud/firestore").DocumentSnapshot<UserPublic>} UserPublicDocumentSnapshot
 * @param {import("firebase-functions").Change<UserPublicDocumentSnapshot>} change
 * @returns {Promise<any>}
 */
exports.onUserWrite = async (change) => {
  if (!SG_KEY) {
    console.log('onUserWrite: No SG marketing key');
  }

  const { after } = change;

  if (!after.exists) {
    fail('invalid-argument');
  }

  // We now have a:
  // Creation event (!before.exists)
  // OR Update event (before.exists)
  const userPublic = after.data();

  if (!userPublic) {
    fail('internal');
  }

  const { firstName, superfan, countryCode } = userPublic;

  const authUser = await auth.getUser(after.id);
  const sendgridContact = {
    email: authUser.email,
    first_name: firstName,
    country: countryCode,
    custom_fields: {
      // Because only numbers & text are supported as data types, not
      // (not sure how they appear in "JSON" data exports though)
      [SENDGRID_SUPERFAN_FIELD_ID]: superfan ? 1 : 0
    }
  };
  await sendgridClient.request({
    url: '/v3/marketing/contacts',
    method: 'PUT',
    body: {
      contacts: [sendgridContact]
    }
  });
};
