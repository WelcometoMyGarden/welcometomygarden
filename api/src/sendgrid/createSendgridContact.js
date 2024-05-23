// @ts-check
/* eslint-disable camelcase */
const { disable_contacts } = require('firebase-functions').config().sendgrid;
const { setTimeout } = require('node:timers/promises');
const {
  sendgrid: sendgridClient,
  SG_WTMG_NEWS_YES_ID,
  SG_WTMG_ID_FIELD_ID,
  SG_CREATION_TIME_FIELD_ID
} = require('./sendgrid');
const fail = require('../util/fail');
const { db } = require('../firebase');

/**
 * @typedef {import("../../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("firebase-admin/auth").UserRecord} UserRecord
 */

/**
 * Add a contact for this user to SendGrid, and store its contact ID
 * in the user's users-private doc.
 * Precondition: the user's users-private document must already exist
 * @param {UserRecord} firebaseUser
 * @param {{custom_fields?: Record<string,string>, [key: string]: object | string}} extraContactDetails use the { custom_fields: {} } sub-property for custom fields
 * @param {boolean} addToNewsletter
 */
const createSendgridContact = async (
  firebaseUser,
  extraContactDetails = {},
  addToNewsletter = false
) => {
  if (disable_contacts) {
    console.warn('Ignoring SendGrid contact creation');
    return;
  }

  if (!firebaseUser.email) {
    console.error('New Firebase users must always have an email address');
    fail('invalid-argument');
  }

  console.info(`Creating new SendGrid contact for uid ${firebaseUser.uid} / ${firebaseUser.email}`);
  const sendgridContactCreationDetails = {
    email: firebaseUser.email,
    // Set to first name on creation
    first_name: firebaseUser.displayName,
    ...extraContactDetails,
    custom_fields: {
      [SG_WTMG_ID_FIELD_ID]: firebaseUser.uid,
      [SG_CREATION_TIME_FIELD_ID]: new Date(firebaseUser.metadata.creationTime).toISOString(),
      ...(extraContactDetails.custom_fields ?? {})
    }
  };

  // Create the contact in SG
  /**
   * @type {string | undefined}
   */
  let contactCreationJobId;
  let list_ids;
  if (addToNewsletter) {
    list_ids = [SG_WTMG_NEWS_YES_ID];
  }
  try {
    const [{ statusCode }, { job_id }] = await sendgridClient.request({
      url: '/v3/marketing/contacts',
      method: 'PUT',
      body: {
        // Inclusion assumed on creation, for now.
        ...(list_ids ? { list_ids } : {}),
        contacts: [sendgridContactCreationDetails]
      }
    });
    if (statusCode !== 202) {
      console.error('Unexpected non-erroring SendGrid response when creating a new contact');
      fail('internal');
    }
    contactCreationJobId = job_id;
  } catch (e) {
    console.error(JSON.stringify(e));
    fail('internal');
  }
  // Poll for the status of the creation via its job_id
  /**
   * @type {string | undefined}
   */
  if (!contactCreationJobId) {
    console.error('Missing SendGrid job ID when creating a new contact');
    fail('internal');
  }
  /** @type {'pending'|'completed'|'errored'|'failed'} */
  let status = 'pending';
  // From staging tests: this may take long
  // 179,339(3 mins) - 250 secs
  const MAX_ITERATIONS = 100;
  let currentIteration = 0;
  while (status === 'pending' && currentIteration < MAX_ITERATIONS) {
    // eslint-disable-next-line no-await-in-loop
    await setTimeout(3000);
    // Check for the statustoISOString
    const [
      ,
      {
        status: latestStatus,
        results: { errored_count, updated_count }
      }
      // eslint-disable-next-line no-await-in-loop
    ] = await sendgridClient.request({
      url: `/v3/marketing/contacts/imports/${contactCreationJobId}`,
      method: 'GET'
    });

    // It may take more than a minute before 'pending' becomes 'completed' or something else
    // but intermediary results seem to be enough for us to know the actual status
    // They come more quickly
    if (errored_count === 1) {
      status = 'failed';
    } else if (updated_count === 1) {
      status = 'completed';
    } else {
      status = latestStatus;
    }

    currentIteration += 1;
  }

  if (currentIteration === MAX_ITERATIONS) {
    console.error(`SendGrid's contact creation job did not complete in a reasonable time`);
    fail('internal');
  }

  if (status !== 'completed') {
    console.error(`Unexpected SendGrid job status ${status}`);
    fail('internal');
  }

  const [{ statusCode: getIdStatusCode }, { result, errors }] = await sendgridClient.request({
    url: '/v3/marketing/contacts/search/emails',
    method: 'POST',
    body: {
      emails: [firebaseUser.email]
    }
  });

  if (getIdStatusCode !== 200 || errors) {
    console.error('Something went wrong while getting the SendGrid contact ID', errors);
    fail('internal');
  }
  if (!result || !(firebaseUser.email && firebaseUser.email in result)) {
    console.log('Contact not found in SendGrid!');
    fail('internal');
  }

  // Add the sendgrid contact ID to firebase
  const { id: contactId } = result[firebaseUser.email].contact;

  try {
    await db.doc(`users-private/${firebaseUser.uid}`).update({
      sendgridId: contactId
    });
  } catch (e) {
    // NOTE: If the account is deleted < 30 secs after creation, this will
    // lead to an uncaught error (can't update non-existing doc).
    // We're not properly handling this yet, the SendGrid contact might linger due to this race condition.
    console.error(
      "Couldn't update a users-private doc with an initial sendgridId set. Was the account deleted before sendgrid added the contact?",
      e
    );
  }
};
exports.createSendgridContact = createSendgridContact;
