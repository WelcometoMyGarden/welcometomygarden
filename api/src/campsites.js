/* eslint-disable camelcase */
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { FieldValue } = require('firebase-admin/firestore');
const { sendgrid: sendgridClient, SG_HOST_FIELD_ID } = require('./sendgrid/sendgrid');
const fail = require('./util/fail');
const { auth, db } = require('./firebase');

/**
 * @typedef {import("../../src/lib/types/Garden").Garden} Garden
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * @param {import("@google-cloud/firestore").QueryDocumentSnapshot<Garden>} queryDocumentSnapshot
 */
exports.onCampsiteCreate = async (queryDocumentSnapshot) => {
  const uid = queryDocumentSnapshot.id;

  /**
   * @type {UserRecord | undefined}
   */
  let user;
  try {
    user = await auth.getUser(uid);
  } catch (e) {
    // At the time of writing, there exist about 10 gardens with ids that don't match a user's ID
    // Probably gardens of deleted users! This error not happen on create, but better to handle it.
    console.error("Couldn't fetch the user connected to a garden");
  }
  if (user) {
    // Sync the host status to SendGrid
    const sendgridContactUpdateDetails = {
      email: user.email,
      custom_fields: {
        [SG_HOST_FIELD_ID]: 1
      }
    };

    try {
      const [{ statusCode }] = await sendgridClient.request({
        url: '/v3/marketing/contacts',
        method: 'PUT',
        body: {
          contacts: [sendgridContactUpdateDetails]
        }
      });
      if (statusCode !== 202) {
        console.error(
          'Unexpected non-erroring SendGrid response when updating the campsite of a contact'
        );
        fail('internal');
      }
    } catch (e) {
      console.error(JSON.stringify(e));
    }
  }

  // Update statistics
  await db
    .collection('stats')
    .doc('campsites')
    .set({ count: FieldValue.increment(1) }, { merge: true });
};

/**
 * @param {import("@google-cloud/firestore").QueryDocumentSnapshot<Garden>} queryDocumentSnapshot
 */
exports.onCampsiteDelete = async (queryDocumentSnapshot) => {
  // Mark the connected user as non-host in SendGrid

  const uid = queryDocumentSnapshot.id;
  /** @type {UserRecord | undefined} */
  let user;
  try {
    // This case happens when we manually delete a garden document in Firebase. This is sometimes requested, as we don't
    // support a user-facing way of doing this yet.
    user = await auth.getUser(uid);
  } catch (e) {
    // - Possible: the user is being deleted through Firebase auth, and this deletion is a result of the cleanup calls after that action.
    //   in this case, the cleanup call will also fully delete the SendGrid contact!
    // - Also possible: at the time of writing, there exist about 10 gardens with ids that don't match a user's ID
    console.info(
      `Couldn't fetch the user connected to a garden (id: ${uid}) while deleting it. This is probably expected.`
    );
  }
  if (user) {
    // Sync the host status to SendGrid
    const sendgridContactUpdateDetails = {
      email: user.email,
      custom_fields: {
        [SG_HOST_FIELD_ID]: 0
      }
    };

    try {
      const [{ statusCode }] = await sendgridClient.request({
        url: '/v3/marketing/contacts',
        method: 'PUT',
        body: {
          contacts: [sendgridContactUpdateDetails]
        }
      });
      if (statusCode !== 202) {
        console.error(
          'Unexpected non-erroring SendGrid response when updating the campsite of a contact'
        );
        fail('internal');
      }
    } catch (e) {
      console.error(JSON.stringify(e));
    }
  }

  await db
    .collection('stats')
    .doc('campsites')
    .set({ count: FieldValue.increment(-1) }, { merge: true });
};
