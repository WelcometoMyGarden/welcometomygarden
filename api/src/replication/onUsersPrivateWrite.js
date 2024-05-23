const { replicate } = require('./shared');

/**
 * @param {import("firebase-functions").Change<any>} change
 */
module.exports = async (change) => {
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
      'stripeSubscription'
    ]
  });
};
