const { sendgrid: sendgridClient } = require('../sendgrid/sendgrid');
const fail = require('../util/fail');
const { createSendgridContact } = require('../sendgrid/createSendgridContact');
const {
  sendgridCommunicationLanguageFieldIdParam,
  sendgridCreationLanguageFieldIdParam,
  sendgridWtmgNewsletterListId,
  isContactSyncDisabled,
  sendgridHostFieldIdParam,
  sendgridNewsletterFieldIdParam
} = require('../sharedConfig');
const logger = require('firebase-functions/logger');
const { auth } = require('../firebase');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<UserPrivate>>, { userId: string; }>} event
 * @returns {Promise<any>}
 */
exports.onUserPrivateWrite = async ({ data: change, params }) => {
  const { before, after } = change;

  const uid = params.userId;

  const isCreationWrite = !before.exists && after.exists;

  // Note when we used functions V1: context.auth?.uid is undefined on deletion
  // In V2, a different handler needs to be used if auth info should be accessed.

  // We are only interested in:
  // - creation events (!before.exists)
  // - update event (before.exists)
  // In both cases, after.exists should be true
  // In case of deletion, do nothing. cleanupUserOnDelete handles this.
  if (!after.exists) {
    logger.debug(
      `Aborting onUserPrivateWrite for ${uid} because the "after" doc does not exist. This is normal in case of a deletion.`
    );
    return;
  }

  // Extract users-private data
  const userPrivateAfter = after.data();

  if (!userPrivateAfter) {
    // Should not hapen, if after.exists it should have data.
    logger.error('After data did not exist');
    fail('internal');
  }

  /**
   * @type {UserPrivate | null} userPrivateBefore
   */
  let userPrivateBefore = null;
  if (before.exists) {
    userPrivateBefore = before.data();
  }

  // Prepare to create or update a SendGrid contact for this user
  const { lastName, communicationLanguage, sendgridId } = userPrivateAfter;
  const sendgridContactUpdateFields = {
    last_name: lastName,
    custom_fields: {
      [sendgridCommunicationLanguageFieldIdParam.value()]: communicationLanguage
    }
  };

  if (
    !isContactSyncDisabled() &&
    !sendgridId &&
    (isCreationWrite ||
      (!isCreationWrite && Date.now() - before.createTime.toMillis() > 15 * 60 * 1000))
  ) {
    // - always create a contact on a creation write
    // - OR try to create a contact when sendgridId is missing from the after document, it is an update,
    //   and the private doc was created at least 15 minutes ago. This is meant to capture old users
    //   who re-subscribe, and who were never had a contact in SendGrid. Updates within 15 minutes will
    //   enter the normal "update" clause which doesn't trigger SendGrid ID checks.
    //
    // Contact creation will "recursively" trigger another userPrivate write event when the sendgridId is written,
    // through checkContactCreation. This other runthrough is useful, because it is possible that within the 30+ secs
    // it takes SendGrid to acknowledge the new contact ID, the new user has unsubscribed
    // from SendGrid. See `unsubscribedWhileAddingSendGridId` below.
    if (isCreationWrite) {
      // For new accounts
      await createSendgridContact(uid, {
        extraContactDetails: {
          ...sendgridContactUpdateFields,
          custom_fields: {
            ...sendgridContactUpdateFields.custom_fields,
            // A new account will always start by not being a host
            [sendgridHostFieldIdParam.value()]: 0,
            // The creation language will be updated only one time, upon the creation
            // of a users-private doc. It is intentionally not set if an older user
            // triggers a contact creation, to prevent being enrolled in unwanted SendGrid automations.
            //
            ...(userPrivateAfter.creationLanguage != null
              ? {
                  [sendgridCreationLanguageFieldIdParam.value()]: userPrivateAfter.creationLanguage
                }
              : {})
          }
        },
        addToNewsletter: userPrivateAfter.emailPreferences.news,
        fetchContactDetails: false
      });
      if (userPrivateAfter.creationLanguage == null) {
        // Bug investigation: https://www.notion.so/slowby/Some-SendGrid-contacts-get-created-without-creation-language-in-1c14f49e318e80e8a610ec95e36b07fd?pvs=4
        logger.error(`Creating a new SG contact without creationLanguage, this is unexpected`, {
          uid,
          creationLanguage: userPrivateAfter.creationLanguage,
          communicationLanguage: userPrivateAfter.communicationLanguage
        });
      }
    } else if (userPrivateAfter.emailPreferences.news) {
      // If it is not a creation write (but an old re-subscribed contact), make sure all
      // relevant info is fetched (including host status), because we can't make new-account
      // assumptions here.
      await createSendgridContact(uid);
    }
  } else if (!isContactSyncDisabled()) {
    // Otherwise, this is an update of changed information

    // Check if we should do a newsletter list addition
    // This could happen when someone unsubscribes, re-subscribes, or another users-private change happens.
    /**
     * @type {string[] | null}
     */
    let list_ids = null;

    const changedToNewsTrue =
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === false &&
      userPrivateAfter &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === true;

    const changedToNewsFalse =
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === true &&
      userPrivateAfter &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === false;

    const isSendgridIdAdditionWrite =
      userPrivateBefore &&
      userPrivateAfter &&
      userPrivateBefore.sendgridId == null &&
      userPrivateAfter.sendgridId != null;

    /**
     * The "false to false" case.
     * This catches a race condition where news was set to false while the SendGrid id was being set.
     * In that case, the userPrivateBefore news state will already be false when the sendgridId is being set,
     * but the change won't have synced yet to SendGrid, because list deletions (below) are
     * dependent on the sendgridId being present.
     */
    const unsubscribedWhileAddingSendGridId =
      isSendgridIdAdditionWrite &&
      userPrivateAfter &&
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === false &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === false;

    if (changedToNewsTrue) {
      list_ids = [sendgridWtmgNewsletterListId.value()];
    }

    // Perform the contact details update in any case
    try {
      const { email } = await auth.getUser(uid);
      await sendgridClient.request({
        url: '/v3/marketing/contacts',
        method: 'PUT',
        body: {
          ...(list_ids ? { list_ids } : {}),
          contacts: [
            {
              email: email,
              ...sendgridContactUpdateFields,
              custom_fields: {
                // 2nd way of representing newsletter membership
                [sendgridNewsletterFieldIdParam.value()]: userPrivateAfter?.emailPreferences.news
                  ? 1
                  : 0
              }
            }
          ]
        }
      });
    } catch (e) {
      logger.error(JSON.stringify(e));
      fail('internal');
    }

    // Check if we should delete the contact from the newsletter list (unsubscribed)
    if (changedToNewsFalse || unsubscribedWhileAddingSendGridId) {
      // Do we have the sendgridId available?
      if (sendgridId) {
        logger.info(`Unsubscribing ${uid} from the newsletter`);
        await sendgridClient.request({
          url: `/v3/marketing/lists/${sendgridWtmgNewsletterListId.value()}/contacts`,
          method: 'DELETE',
          qs: {
            contact_ids: sendgridId
          }
        });
      } else {
        logger.warn(
          `${uid} unsubscribed before their sendgridId was resolved. The unsubscribe should be picked up as soon as the ID is resolved.`
        );
      }
    }
  }
};
