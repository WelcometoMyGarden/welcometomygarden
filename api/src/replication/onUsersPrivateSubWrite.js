const { replicate } = require('./shared');

/**
 * @typedef {import("@google-cloud/firestore").DocumentSnapshot<any>} DocumentSnapshot
 * @param {import("firebase-functions").Change<any>} change
 * @param {import('firebase-functions').EventContext<{userId: string, subcollection: string, documentId: string}>} context
 * @returns {Promise<any>}
 */
module.exports = async (change, context) => {
  const { userId, subcollection } = context.params;
  const subcollectionTableName = subcollection.replace('-', '_');
  if (!subcollectionTableName.match(/push_registrations|trails|unreads/)) {
    console.log(`Unsupported subcollection change: ${subcollection}`);
    return;
  }

  if (subcollectionTableName === 'unreads') {
    await replicate({
      change,
      tableName: subcollectionTableName,
      dataMapper: ([k, v]) => {
        // For unreads
        if (k === 'chatId') {
          return ['chat_id', v];
        }
        return [k, v];
      },
      extraProps: {
        user_id: userId
      },
      extraDeletionFilters: [['user_id', userId]]
    });
  } else {
    await replicate({
      change,
      tableName: subcollectionTableName,
      extraProps: {
        user_id: userId
      }
    });
  }
};
