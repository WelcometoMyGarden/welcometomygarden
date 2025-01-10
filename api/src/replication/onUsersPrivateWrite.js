const { replicate } = require('./shared');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<UserPrivate>>>} event
 */
module.exports = async ({ data: change }) => {
  await replicate({
    change,
    tableName: 'users_private',
    // Ignore possible newEmail/oldEmail properties
    pick: [
      'lastName',
      'consentedAt',
      'emailPreferences',
      'communicationLanguage',
      'creationLanguage',
      'sendgridId',
      'stripeCustomerId',
      'stripeSubscription',
      'createTime',
      'updateTime',
      'reference'
    ]
  });
};
