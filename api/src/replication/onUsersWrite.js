const { replicate } = require('./shared');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<UserPublic>>>} change
 */
module.exports = async ({ data: change }) => {
  await replicate({
    change,
    tableName: 'users_public',
    pick: ['firstName', 'countryCode', 'superfan', 'savedGardens', 'createTime', 'updateTime']
  });
};
