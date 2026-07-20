const { replicate } = require('./shared');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot>, {userId: string, subcollection: string, documentId: string}>} change
 * @returns {Promise<any>}
 */
module.exports = async ({ data: change, params }) => {
  const { userId, subcollection } = params;
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
  } else if (subcollectionTableName === 'trails') {
    await replicate({
      change,
      tableName: subcollectionTableName,
      // Special case, because this one needs to explicitly include createTime and updateTime (metadata props)
      // Note: the (backfilled) Firebase docs also have an in-document `createdAt` property
      // for client-side access (similar to `consentedAt`). It is equal (or nearly equal) to `createTime`,
      // and it's therefore not useful to sync it.
      pick: ['originalFileName', 'md5Hash', 'visible', 'createTime', 'updateTime'],
      extraProps: {
        user_id: userId
      }
    });
  } else {
    // push_registrations
    await replicate({
      change,
      tableName: subcollectionTableName,
      extraProps: {
        user_id: userId
      }
    });
  }
};
