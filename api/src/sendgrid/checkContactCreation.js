const { logger } = require('firebase-functions/v2');
const fail = require('../util/fail');
const { sendgrid: sendgridClient } = require('./sendgrid');
const { auth, db } = require('../firebase');
const { createSendgridContact } = require('./createSendgridContact');
const getContactByEmail = require('./getContactByEmail');
const { sendgridCreationLanguageFieldIdParam } = require('../sharedConfig');

/**
 *
 * @param {import('firebase-functions/v2/tasks').Request<ContactCreationCheckData>} req
 * @returns {Promise<void>}
 */
module.exports = async function checkContactCreation(req) {
  const { uid, creationLanguage, jobId, attempt } = req.data;

  logger.info(
    `Checking SG contact creation of uid ${uid} / jobId ${jobId} on creation attempt ${attempt}, check no. ${req.retryCount + 1}`
  );

  /**
   * @type {string | undefined}
   */
  if (!jobId) {
    logger.error('Missing SendGrid job ID when checking for a new contact');
    // Don't throw an error, because it will cause a pointless retry
    return;
  }

  // Check the job status
  /** @type {'pending'|'completed'|'errored'|'failed'} */
  let status = 'pending';
  const [
    ,
    {
      status: latestStatus,
      results: { errored_count, updated_count }
    }
  ] = await sendgridClient.request({
    url: `/v3/marketing/contacts/imports/${jobId}`,
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

  if (status === 'pending') {
    logger.info(`jobId ${jobId} is still pending`);
    // We rely on error-based retry logic to check again
    fail('not-found');
  }

  // The job completed, and it either succeeded, errored or failed

  // First, check if we still want to do anything with the result
  /**
   * @type {UserRecord}
   */
  let firebaseUser;
  try {
    firebaseUser = await auth.getUser(uid);
  } catch (e) {
    // This means a SendGrid Contact deletion call should have happened in the cleanup function too
    logger.warn(
      'The user was deleted while checking for its SendGrid Contact creation, finishing this task.',
      { uid }
    );
    return;
  }

  // The job errored or failed
  if (status !== 'completed') {
    if (attempt === 3) {
      // This means we are checking the 3rd attempt, and it failed. Stop here!
      logger.error(`All 3 contact creation attempts exhausted for uid ${uid}`);
      return;
    }

    // We can schedule a retry (schedules another check task)
    try {
      logger.warn(
        `Contact creation job ${jobId} for uid ${uid} failed on attempt ${attempt}, scheduling a retry`
      );
      await createSendgridContact(uid, {
        attempt: attempt + 1,
        // This is a new account creation, retry with the creationLanguage
        ...(creationLanguage
          ? {
              extraContactDetails: {
                custom_fields: {
                  [sendgridCreationLanguageFieldIdParam.value()]: creationLanguage
                }
              }
            }
          : {})
      });
    } catch (e) {
      logger.error(`An error happened while attempting a contact creation call for uid ${uid}`, e);
    }

    // Finish this task
    return;
  }

  // The job completed successfully
  //
  /** @type {SendGrid.ContactDetails | null} */
  let contact = null;
  try {
    contact = await getContactByEmail(firebaseUser.email);
  } catch (e) {
    logger.error(
      "Something went wrong while getting the SendGrid contact by email; can't update Firebase users-private doc with SG ID. Will attempt again."
    );
    // Let it try again on the same job id by erroring.
    fail('internal');
  }

  // Add the sendgrid contact ID to firebase
  const { id: contactId } = contact;

  try {
    await db.doc(`users-private/${firebaseUser.uid}`).update({
      sendgridId: contactId
    });
    logger.info(`Updated uid ${firebaseUser.uid} with sendgridId ${contactId}`);
  } catch (e) {
    // NOTE: If the account is deleted < 30 secs after creation, this will
    // lead to an uncaught error (can't update non-existing doc).
    // We're not properly handling this yet, the SendGrid contact might linger due to this race condition.
    logger.error(
      "Couldn't update a users-private doc with an initial sendgridId set. Was the account deleted before sendgrid added the contact?",
      e
    );
  }
};
