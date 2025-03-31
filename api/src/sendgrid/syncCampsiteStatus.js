const { logger } = require('firebase-functions/v2');
const { changeData, auth } = require('../firebase');
const { updateSendgridContact } = require('./updateSendgridContact');
const { sendgridListedFieldIdParam, sendgridGardenPhotoFieldIdParam } = require('../sharedConfig');
const { affectedKeys } = require('../util/diff');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<Garden>>>} change
 */
module.exports = async ({ data, params: { campsiteId } }) => {
  // Prepare input for change detection
  const { isDeletion, isCreation, beforeData, afterData } = changeData(data);
  if (isDeletion || isCreation) {
    // The and creation and deletion of the contact is not the responsibility of the campsite change handler
    // Both are handled in separate handlers in campsites.js
    logger.info(
      'Ignoring campsite properties update sync to SendGrid due to campsite creation or deletion',
      {
        campsiteId,
        isCreation,
        isDeletion
      }
    );
    return;
  }

  const uid = campsiteId;
  const user = await auth.getUser(uid);

  const changedKeys = affectedKeys(beforeData, afterData);
  if (changedKeys.includes('listed') || changedKeys.includes('photo')) {
    await updateSendgridContact(
      {
        email: user.email,
        custom_fields: {
          [sendgridListedFieldIdParam.value()]: afterData.listed ? 1 : 0,
          [sendgridGardenPhotoFieldIdParam.value()]: afterData.photo ? 1 : 0
        }
      },
      'updated garden'
    );
  } else {
    logger.debug('Ignored campsite write since no relevant property was changed', {
      campsiteId,
      changedKeys
    });
  }
};
