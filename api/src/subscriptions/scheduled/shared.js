const { logger } = require('firebase-functions');
const { auth } = require('../../firebase');

// The delay after full cancellation after which the feedback request email is sent
exports.FEEDBACK_EMAIL_DELAY_DAYS = 5;
exports.FULL_CANCELLATION_DELAY_DAYS = 7;
// The delay after the expiration date (start of new period), after which the first reminder should be sent
exports.FIRST_REMINDER_EMAIL_DELAY_DAYS = 5;

// derived
exports.FEEDBACK_EMAIL_DAYS_AFTER_EXPIRY =
  exports.FULL_CANCELLATION_DELAY_DAYS + exports.FEEDBACK_EMAIL_DELAY_DAYS;

exports.userPrivateDocIds = (docs) => {
  return docs
    .filter((e) => e)
    .map((d) => d?.id || '')
    .join(', ');
};

/**
 * Processes the given users-private snapshot by first enriching them with Firebase Auth data,
 * and then calling the user-provided function.
 * Returns for the user when the combined user when the function call succeeds.
 * Returns null for the user when the user Auth data can't be found, or the function call fails.
 *
 * @param {import('firebase-admin/firestore').DocumentSnapshot<Firebase.UserPrivate>[]} userPrivateDocs
 * @param {(combinedUser: {id: string} & Omit<Firebase.UserRecord, 'toJSON'> & Firebase.UserPrivate ) => void} processFn
 * @param {string} processDescription
 */
exports.processUserPrivateDocs = async (userPrivateDocs, processFn, processDescription) => {
  const results = await Promise.all(
    userPrivateDocs.map(async (userPrivateDoc) => {
      try {
        const authUser = await auth.getUser(userPrivateDoc.id);
        if (!authUser || !authUser.email || !authUser.displayName) {
          logger.error(
            `User with ID ${userPrivateDoc.id} not found, or doesn't have the required data for our email`
          );
          return null;
        }
        const data = userPrivateDoc.data();

        const combined = { id: userPrivateDoc.id, ...data, ...authUser };
        await processFn(combined);
        return combined;
      } catch (e) {
        logger.error(`Error ${processDescription} user ${userPrivateDoc.id}: ${e}`);
        return null;
      }
    })
  );

  logger.log(`${processDescription} succeeded for: ${this.userPrivateDocIds(results)}`);
};
