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
      'communicationLanguage',
      'consentedAt',
      'createTime',
      'creationLanguage',
      'emailPreferences',
      'lastName',
      'latestSpamAlertAt',
      'reference',
      'secret',
      'sendgridId',
      'stripeCustomerId',
      'stripeSubscription',
      'updateTime'
    ]
  });
};
