const { logger } = require('firebase-functions/v2');
const { db, getUserDocRefsWithData } = require('../firebase');
const fail = require('../util/fail');
const { sendMessageReminderEmail } = require('../mail');
const { normalizeMessage, buildMessageUrl } = require('../util/mail');
const { getUser } = require('./util');

/**
 * @param {import('firebase-functions/v2/tasks').Request<SendMessageReminderData>} req
 * @returns {Promise<void>}
 */
exports.sendMessageReminder = async function (req) {
  const { chatId, senderUid } = req.data;
  const messagesCol = /** @type {CollectionReference<Message>} */ (
    db.collection(`chats/${chatId}/messages`)
  ).orderBy('createdAt', 'asc');

  // First check if the sender is not deleted or disabled
  /**
   * @type {UserRecord}
   */
  let sender = await getUser(senderUid, 'message reminder email');
  if (!sender) {
    logger.debug('No available sender, skipping message reminder email');
    return;
  }

  // Fetch all messages of the chat
  const messages = (await messagesCol.get()).docs.map((d) => d.data());

  // Sanity check: the first message should have been sent by the sender, at least 23 hours ago
  if (
    // if no first message
    !messages[0] ||
    // if not from the sender
    messages[0].from !== senderUid ||
    // if the first message was created less than 23 hours ago
    messages[0].createdAt.toMillis() > Date.now() - 23 * 3600 * 1000
  ) {
    throw new Error(`Sanity check for the message reminder email of ${chatId} failed, skipping`);
  }

  // Find a message from the host (= any message in the chat, not from the sender)
  /**
   * @type {Message | undefined}
   */
  const answerFromHost = messages.find((m) => m.from !== senderUid);

  // The chat was answered, nothing further to do
  if (answerFromHost) {
    logger.info(
      `Chat ${chatId} sent by ${senderUid} was answered by ${answerFromHost.from}, skipping reminder email.`
    );
    return;
  }

  // The chat was not answered: send the reminder email
  const chat = (
    await /** @type {DocumentReference<Chat>} */ (db.doc(`chats/${chatId}`)).get()
  ).data();
  const hostUid = chat.users.find((id) => id !== senderUid);
  if (!hostUid) {
    fail('internal');
  }
  const host = await getUser(hostUid, 'message reminder email');
  if (!host) {
    logger.debug(
      'No host available to send the reminder message to, skipping message reminder email'
    );
    return;
  }
  const {
    privateUserProfileData: hostPrivateUserProfileData,
    publicUserProfileData: hostPublicUserProfileData
  } = await getUserDocRefsWithData(hostUid);

  // Combine messages with a newline, because we know that only the sender has sent messages yet.
  const combinedSenderMessage = messages
    .slice(1)
    .reduce((acc, { content }) => `${acc}\n\n${content}`, messages[0]?.content ?? '');

  logger.info(
    `Sending message reminder email for chat ${chatId} by traveller ${senderUid} to host ${host.uid}`
  );
  await sendMessageReminderEmail({
    email: host.email,
    firstName: hostPublicUserProfileData.firstName,
    language: hostPrivateUserProfileData.communicationLanguage,
    senderName: sender.displayName,
    message: normalizeMessage(combinedSenderMessage),
    messageUrl: buildMessageUrl(sender.displayName, chatId)
  });
};
