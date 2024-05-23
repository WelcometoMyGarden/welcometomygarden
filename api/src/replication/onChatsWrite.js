/**
 * @typedef {import("../../../src/lib/types/Chat").FirebaseChat} FirebaseChat
 */

const { replicate } = require('./shared');

/**
 * @param {import("firebase-functions").Change<any>} change
 */
module.exports = async (change) => {
  await replicate({
    change,
    tableName: 'chats',
    dataMapper: ([key, value]) => {
      if (key === 'users') {
        return [
          ['createdByUser_id', value[0]],
          ['withUser_id', value[1]]
        ];
      }
      if (key === 'lastMessageSender') {
        return ['lastMessageSender_id', value];
      }
      return [key, value];
    }
  });
};
