const { sendgrid: sendgridClient } = require('../sendgrid/sendgrid');
const fail = require('../util/fail');
const { createSendgridContact } = require('../sendgrid/createSendgridContact');
const { auth } = require('../firebase');
const {
  sendgridCommunicationLanguageFieldIdParam: sendgridCommuniationLanguageFieldIdParam,
  sendgridCreationLanguageFieldIdParam,
  sendgridWtmgNewsletterListId,
  isContactSyncDisabled
} = require('../sharedConfig');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<UserPrivate>>, { userId: string; }>} event
 * @returns {Promise<any>}
 */
exports.onUserPrivateWrite = async ({ data: change, params }) => {
  // TODO: current problematic situation
  // 1. the initial createUser call calls this first.
  // 2. This results in a call to createSendgridContact, which takes about 32 seconds
  // 3. Any update to user private within this window (e.g. comm language change, newsletter pref update)
  //    will restart createSendGridContact (another 32 sec), because sendGridId is not defined yet.
  // 4. createSendGridContact itself triggers another onUserPrivateWrite (we need this one! see comment on the call)
  // To avoid the (3) situation, we need a way to make sure that whichever changes DO happen in those 30 seconds, won't cause a redundant update.
  // - create the sendgrid account in the createUser function: unacceptable, because it would delay account creation (already slow) with 30 sec
  //    we have to await the polling, because the function thread might be force-terminated after returning https://stackoverflow.com/a/51802305/4973029
  // - ! calling another cloud function from createUser, that can complete on its own, and just does the update?
  //    https://stackoverflow.com/questions/58362694/how-to-call-cloud-function-inside-another-cloud-function-and-pass-some-input-par
  //    pubsub or http? not oncall?
  //     pubsub looks promising, because the publisher is just that (publisher), and not a caller that needs to await a response
  //      - -> simple demo: https://blog.minimacode.com/publish-message-to-pubsub-emulator/
  //      - https://firebase.google.com/docs/functions/pubsub-events
  //      - https://cloud.google.com/pubsub/docs/publish-receive-messages-client-library#node.js_1
  //      - https://medium.com/@r_dev/using-pub-sub-in-firebase-emulator-3d4b897d2441
  //      - https://www.reddit.com/r/Firebase/comments/mfu8k6/how_do_i_publish_messages_with_the_pubsub/
  // - webhooks? don't exist for contact creation
  //   https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook
  // - using another firestore collection's doc to track whether we are polling for this uid or not...
  const { before, after } = change;

  // console.log('before ', JSON.stringify(before.data(), null, 2));
  // console.log('after ', JSON.stringify(after.data(), null, 2));
  const isCreationWrite = !before.exists && after.exists;

  // Note when we used functions V1: context.auth?.uid is undefined on deletion
  // In V2, a different handler needs to be used if auth info should be accessed.
  // We are only interested in:
  // - creation events (!before.exists)
  // - update event (before.exists)
  // In both cases, after.exists should be true
  if (!after.exists) {
    return;
  }

  // Extract users-private data
  const userPrivateAfter = after.data();

  if (!userPrivateAfter) {
    // Should not hapen, if after.exists it should have data.
    fail('internal');
  }

  /**
   * @type {UserPrivate | null} userPrivateBefore
   */
  let userPrivateBefore = null;
  if (before.exists) {
    userPrivateBefore = before.data();
  }

  // Create or update a SendGrid contact for this user
  const authUser = await auth.getUser(params.userId);
  const { lastName, communicationLanguage, sendgridId } = userPrivateAfter;
  const sendgridContactUpdateFields = {
    email: authUser.email,
    last_name: lastName,
    custom_fields: {
      [sendgridCommuniationLanguageFieldIdParam.value()]: communicationLanguage
    }
  };

  // NOTE: the following case is fully ignored
  // `sendgridId == null && userPrivateAfter.emailPreferences?.news === false`
  //
  if (
    sendgridId == null &&
    userPrivateAfter.emailPreferences?.news === true &&
    !isContactSyncDisabled()
  ) {
    // Only add this contact to SendGrid if they want to receive news, and are
    // not in SendGrid yet. This applies to all newly created contacts, and to existing contacts
    // that change a userPrivate property (e.g. communicationLanguage), while never having been added to SendGrid.
    //
    // This will "recursively" trigger another userPrivate write event when the sendgridId is written.
    // This other runthrough is useful, because it is possible that within the 30 secs
    // it takes SendGrid to acknowledge the new contact ID, the new user has unsubscribed
    // from SendGrid. Syncing that unsubscribe would then *have been ignored* by the code below, because
    // the sendgridId is not yet available. It's a race condition, which is mitigated by the second runthrough
    // that does the final sync. See `unsubscribedWhileAddingSendGridId`
    await createSendgridContact(
      authUser,
      {
        ...sendgridContactUpdateFields,
        custom_fields: {
          ...sendgridContactUpdateFields.custom_fields,
          // The creation language will be updated only one time, upon the creation
          // of a users-private doc.
          ...(isCreationWrite && userPrivateAfter.creationLanguage != null
            ? {
                [sendgridCreationLanguageFieldIdParam.value()]: userPrivateAfter.creationLanguage
              }
            : {})
        }
      },
      true
    );
  } else if (sendgridId != null) {
    // Otherwise, this is an update of changed information
    // Check if we should do a newsletter list addition
    // This could happen when someone unsubscribes, and then re-subscribes.
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

    if (changedToNewsTrue) {
      list_ids = [sendgridWtmgNewsletterListId.value()];
    }

    // Perform the update in any case
    if (!isContactSyncDisabled()) {
      try {
        await sendgridClient.request({
          url: '/v3/marketing/contacts',
          method: 'PUT',
          body: {
            ...(list_ids ? { list_ids } : {}),
            contacts: [sendgridContactUpdateFields]
          }
        });
      } catch (e) {
        console.error(JSON.stringify(e));
        fail('internal');
      }
    }

    const changedToNewsFalse =
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === true &&
      userPrivateAfter &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === false;

    const addedSendgridId =
      userPrivateBefore &&
      userPrivateAfter &&
      userPrivateBefore.sendgridId == null &&
      userPrivateAfter.sendgridId != null;

    /**
     * This catches a race condition where news was set to false while the SendGrid was being set.
     * In that case, the userPrivateBefore news state will already be false when the sendgridId is being set,
     * but the change won't have synced yet to SendGrid, because deletions are dependent on the sendgridId.
     */
    const unsubscribedWhileAddingSendGridId =
      addedSendgridId &&
      userPrivateAfter &&
      userPrivateBefore &&
      userPrivateBefore.emailPreferences &&
      userPrivateBefore.emailPreferences.news === false &&
      userPrivateAfter.emailPreferences &&
      userPrivateAfter.emailPreferences.news === false;

    // Check if we should do a newsletter list deletion
    if ((changedToNewsFalse || unsubscribedWhileAddingSendGridId) && !isContactSyncDisabled()) {
      await sendgridClient.request({
        url: `/v3/marketing/lists/${sendgridWtmgNewsletterListId.value()}/contacts`,
        method: 'DELETE',
        qs: {
          contact_ids: sendgridId
        }
      });
    }
  }

  // In case of deletion, do nothing.
  // cleanupUserOnDelete handles this.
};
