// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getAuth } = require('firebase-admin/auth');
// eslint-disable-next-line import/no-unresolved
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const removeDiacritics = require('./util/removeDiacritics');
const { sendMessageReceivedEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');

const auth = getAuth();
const db = getFirestore();

const normalizeMessage = (str) => str.replace(/\n\s*\n\s*\n/g, '\n\n');
const normalizeName = (str) => removeDiacritics(str).toLowerCase();

exports.onMessageCreate = async (snap, context) => {
  const message = snap.data();
  const senderId = message.from;
  const { chatId } = context.params;

  const doc = await db.collection('chats').doc(chatId).get();
  const chat = doc.data();

  const recipientId = chat.users.find((uid) => senderId !== uid);
  const unreadDoc = await db
    .collection('users-private')
    .doc(recipientId)
    .collection('unreads')
    .doc(chatId)
    .get();

  await db
    .collection('stats')
    .doc('messages')
    .set({ count: FieldValue.increment(1) }, { merge: true });

  const recipientDoc = await db.collection('users-private').doc(recipientId).get();
  const recipientEmailPreferences = recipientDoc.data().emailPreferences;

  let shouldNotify = recipientEmailPreferences.newChat || true;
  if (shouldNotify && unreadDoc.exists) {
    const unread = unreadDoc.data();
    const nowDate = new Date();
    // Elapsed time since last notification in milliseconds
    const elapsedTime = nowDate.getTime() - unread.notifiedAt.toMillis();
    // user was notified in the last half hour
    if (elapsedTime / 60000 <= 30) {
      shouldNotify = false;
    }
  }

  if (!shouldNotify) return;

  try {
    const recipient = await auth.getUser(recipientId);
    const sender = await auth.getUser(senderId);

    await db.collection('users-private').doc(recipientId).collection('unreads').doc(chatId).set({
      notifiedAt: FieldValue.serverTimestamp(),
      chatId
    });
    const baseUrl = removeEndingSlash(functions.config().frontend.url);

    const nameParts = sender.displayName.split(/[^A-Za-z-]/);
    const messageUrl = `${baseUrl}/chat/${normalizeName(nameParts[0])}/${chatId}`;

    await sendMessageReceivedEmail(
      recipient.email,
      recipient.displayName,
      sender.displayName,
      normalizeMessage(message.content),
      messageUrl
    );
  } catch (ex) {
    console.log(ex);
  }
};

exports.onChatCreate = async () => {
  await db
    .collection('stats')
    .doc('chats')
    .set({ count: FieldValue.increment(1) }, { merge: true });
};
