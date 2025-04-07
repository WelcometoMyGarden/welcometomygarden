const { logger } = require('firebase-functions/v2');
const fail = require('../util/fail');
const { sendgrid: sendgridClient } = require('./sendgrid');
const { auth, db } = require('../firebase');
const { createSendgridContact } = require('./createSendgridContact');
const getContactByEmail = require('./getContactByEmail');
const { sendgridCreationLanguageFieldIdParam } = require('../sharedConfig');
const { deleteContact } = require('./deleteContact');

/**
 *
 * @param {import('firebase-functions/v2/tasks').Request<ContactCreationCheckData>} req
 * @returns {Promise<void>}
 */
module.exports = async function checkContactCreation(req) {
  const { uid, creationLanguage, jobId, attempt, email } = req.data;

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

  /**
   * @type {UserRecord | null}
   */
  let firebaseUser = null;
  let firebaseUserWasDeleted = false;
  try {
    firebaseUser = await auth.getUser(uid);
  } catch (e) {
    // Users could delete their account within seconds or minutes after creation, while these checks are still running.
    firebaseUserWasDeleted = true;
  }

  // The job errored or failed
  if (status !== 'completed') {
    if (firebaseUserWasDeleted) {
      // This should be rare (a rare user-intended super quick delete together with a rare random SendGrid job failure)
      logger.warn(
        'The contact creation failed, but the user was also deleted during the contact creation checks. Attempting a deletion to be sure.',
        { uid, email }
      );
      try {
        await deleteContact({ uid, email });
      } catch (e) {
        logger.warn(
          'Error while deleting a contact after a quick Firebase Auth deletion with an error creation job, probably this nothing to worry about.',
          {
            uid,
            email,
            error: e
          }
        );
      }
      return;
    }

    if (attempt === 3) {
      // This means we are checking the 3rd attempt, and it failed. Stop here!
      logger.error(`All 3 contact creation attempts exhausted`, { uid, email, jobId });
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
    // This is rare, upon completion the contact should be found
    logger.error(
      "Something went wrong while getting the SendGrid contact by email; can't update Firebase users-private doc with SG ID. Will attempt again.",
      {
        uid,
        email,
        jobId
      }
    );
    // Let it try again on the same job id by erroring.
    fail('internal');
  }

  const { id: contactId } = contact;

  if (firebaseUserWasDeleted) {
    logger.warn(
      'A contact was created, but the originating Firebase user was deleted while the contact was being created. Deleting the contact.',
      {
        uid,
        email,
        contactId
      }
    );
    try {
      await deleteContact({ uid, email }, { sendgridId: contactId });
    } catch (e) {
      logger.error(
        'Error while deleting a contact after a quick Firebase Auth deletion, aborting checks',
        {
          uid,
          email,
          contactId,
          error: e
        }
      );
    }
    return;
  }

  // Add the sendgrid contact ID to firebase
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
