const { replicate } = require('./shared');

/**
 * @param {FirestoreEvent<Change<DocumentSnapshot>, { chatId: string; messageId: string }>} change
 * @returns {Promise<any>}
 */
module.exports = async ({ data: change, params }) => {
  const { chatId } = params;
  await replicate({
    change,
    tableName: 'messages',
    // Omitting "merged", which was temporarily added to messages that were merged from
    // duplicate chats.
    pick: ['createdAt', 'content', 'from'],
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
