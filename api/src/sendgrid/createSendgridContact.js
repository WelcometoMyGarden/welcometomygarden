const { logger } = require('firebase-functions');
const { nanoid } = require('nanoid');
const { sendgrid: sendgridClient } = require('./sendgrid');
const fail = require('../util/fail');
const { getFunctionUrl, auth } = require('../firebase');
const {
  sengridWtmgIdFieldIdParam,
  sendgridCreationTimeFieldIdParam,
  sendgridWtmgNewsletterListId,
  isContactSyncDisabled,
  sendgridSecretFieldIdParam,
  sendgridNewsletterFieldIdParam,
  sendgridCreationLanguageFieldIdParam
} = require('../sharedConfig');
const { getFunctions } = require('firebase-admin/functions');
const { collectSendgridContactData } = require('./collectSendgridContactData');

/**
 * Add a contact for this user to SendGrid, and schedule a checker that stores its contact ID in the user's users-private doc.
 * The checker will re-attempt creation upon failure, for a total of 3 times.
 *
 * @param {string} uid
 * @param {SendGrid.CreateSendgridContactOpts} opts
 */
const createSendgridContact = async (
  uid,
  { extraContactDetails, addToNewsletter, attempt, fetchContactDetails } = {
    extraContactDetails: null,
    addToNewsletter: false,
    attempt: 1,
    fetchContactDetails: true
  }
) => {
  if (isContactSyncDisabled()) {
    logger.warn('Ignoring SendGrid contact creation');
    return;
  }

  const fetchedDetails =
    typeof fetchContactDetails === 'undefined' || fetchContactDetails
      ? await collectSendgridContactData(uid)
      : {};

  const contactDetails = {
    ...fetchedDetails,
    // Argument contact details always override
    ...extraContactDetails,
    custom_fields: {
      ...fetchedDetails.custom_fields,
      // Argument contact details always override
      ...extraContactDetails?.custom_fields
    }
  };

  let shouldAddToNewsletter = !!addToNewsletter;
  if (typeof contactDetails.custom_fields[sendgridNewsletterFieldIdParam.value()] === 'number') {
    shouldAddToNewsletter =
      contactDetails.custom_fields[sendgridNewsletterFieldIdParam.value()] === 1;
  }

  const firebaseUser = await auth.getUser(uid);

  if (!firebaseUser.email) {
    logger.error('New Firebase users must always have an email address');
    fail('invalid-argument');
  }

  logger.info(`Creating new SendGrid contact for uid ${firebaseUser.uid} / ${firebaseUser.email}`);
  const sendgridContactCreationDetails = {
    email: firebaseUser.email,
    // Set to first name on creation
    first_name: firebaseUser.displayName,
    // If e.g. the userPublic->firstName is in here, it will override the above (which is OK)
    ...contactDetails,
    custom_fields: {
      [sengridWtmgIdFieldIdParam.value()]: firebaseUser.uid,
      [sendgridCreationTimeFieldIdParam.value()]: new Date(
        firebaseUser.metadata.creationTime
      ).toISOString(),
      // NOTE: in case of an email update, the nanoid secret will change.
      // So via old emails, the unsubscribe can't happen anymore. That's probably OK.
      [sendgridSecretFieldIdParam.value()]: nanoid(),
      // Might be overwritten by extra custom fields below
      ...(shouldAddToNewsletter
        ? {
            [sendgridNewsletterFieldIdParam.value()]: 1
          }
        : {}),
      ...(contactDetails.custom_fields ?? {})
    }
  };

  // Create the contact in SG
  /**
   * @type {string | null}
   */
  let contactCreationJobId = null;
  let list_ids = null;
  if (shouldAddToNewsletter) {
    list_ids = [sendgridWtmgNewsletterListId.value()];
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
      logger.error(
        `Unexpected non-erroring SendGrid response when creating a new contact for uid ${firebaseUser.uid}`
      );
      fail('internal');
    }
    contactCreationJobId = job_id;
  } catch (e) {
    logger.error(
      `Unexpected error while trying to create a new contact for uid ${firebaseUser.uid}`
    );
    logger.debug(JSON.stringify(e));
    fail('internal');
  }

  try {
    const [resourceName, targetUri] = await getFunctionUrl('checkContactCreation');
    /**
     * @type {TaskQueue<ContactCreationCheckData>}
     */
    const checkContactCreationQueue = getFunctions().taskQueue(resourceName);
    // Extract the creationLanguage from the custom fields, if it exists
    const creationLanguage =
      contactDetails.custom_fields[sendgridCreationLanguageFieldIdParam.value()] ?? null;
    await checkContactCreationQueue.enqueue(
      {
        uid: firebaseUser.uid,
        jobId: contactCreationJobId,
        attempt: attempt ?? 1,
        creationLanguage
      },
      {
        scheduleDelaySeconds: 40,
        ...(targetUri
          ? {
              uri: targetUri
            }
          : {})
      }
    );
  } catch (e) {
    logger.error(`Error enqueing a contactCreationCheck for uid ${firebaseUser.uid}`, e);
  }
};
exports.createSendgridContact = createSendgridContact;
