const { replicate } = require('./shared');

/**
 * @param {import("firebase-functions").Change<any>} change
 */
module.exports = async (change) => {
  await replicate({
    change,
    tableName: 'users_public',
    pick: ['firstName', 'countryCode', 'superfan', 'savedGardens', 'createTime', 'updateTime']
  });
};
