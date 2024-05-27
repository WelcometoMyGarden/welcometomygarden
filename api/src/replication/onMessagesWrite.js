const { replicate } = require('./shared');

/**
 * @typedef {import("@google-cloud/firestore").DocumentSnapshot<any>} MessageSnapshot
 * @param {import("firebase-functions").Change<any>} change
 * @param {import('firebase-functions').EventContext<{chatId: string, messageId: string}>} context
 * @returns {Promise<any>}
 */
module.exports = async (change, context) => {
  const { chatId } = context.params;
  await replicate({
    change,
    tableName: 'messages',
    dataMapper: ([k, v]) => {
      if (k === 'from') {
        return ['from_id', v];
      }
      return [k, v];
    },
    extraProps: {
      chat_id: chatId
    }
  });
};
