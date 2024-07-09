const { replicate } = require('./shared');

/**
 * @param {import("firebase-functions").Change<any>} change
 */
module.exports = async (change) => {
  await replicate({
    change,
    tableName: 'campsites',
    // Omit photo-related props and legacy props
    pick: ['description', 'location', 'facilities', 'listed', 'createTime', 'updateTime']
  });
};
