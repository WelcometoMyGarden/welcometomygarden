const { replicate } = require('./shared');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot<Garden>>>} change
 */
module.exports = async ({ data: change }) => {
  // First replicate the change
  await replicate({
    change,
    tableName: 'campsites',
    // Omit legacy props
    pick: [
      'description',
      'location',
      'facilities',
      'listed',
      'createTime',
      'updateTime',
      'photo',
      'latestListedChangeAt',
      'latestRemovedAt',
      'latestWarningForInactivityAt'
    ]
  });
};
