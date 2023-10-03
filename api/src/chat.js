// @ts-check
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { FieldValue } = require('firebase-admin/firestore');
const functions = require('firebase-functions');
const removeDiacritics = require('./util/removeDiacritics');
const { sendMessageReceivedEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');
const { auth, db } = require('./firebase');
const { sendNotification } = require('./push');
const fail = require('./util/fail');

/**
 * @typedef {import("../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("../../src/lib/types/PushRegistration.ts").FirebasePushRegistration} FirebasePushRegistration
 */
/**
 * @typedef {import("firebase-admin/firestore").CollectionReference<FirebasePushRegistration>} PushRegistrationColRef
 */

const normalizeMessage = (str) => str.replace(/\n\s*\n\s*\n/g, '\n\n');
const normalizeName = (str) => removeDiacritics(str).toLowerCase();

/**
 * Sends an email notification of a new chat to a recipient, if the recipient
 * wishes to receive email notifications and has not received a notification about the
 * chat yet very recently.
 */
exports.onMessageCreate = async (snap, context) => {
  const message = snap.data();
  const senderId = message.from;
  const { chatId } = context.params;

  const doc = await db.collection('chats').doc(chatId).get();
  const chat = doc.data();

  const recipientId = chat.users.find((uid) => senderId !== uid);
  const recipientUserPrivateDocRef = db.collection('users-private').doc(recipientId);
  const unreadDoc = await recipientUserPrivateDocRef.collection('unreads').doc(chatId).get();

  await db
    .collection('stats')
    .doc('messages')
    .set({ count: FieldValue.increment(1) }, { merge: true });

  const recipientUserPrivateDocData = /** @type {UserPrivate} */ (
    (await recipientUserPrivateDocRef.get()).data()
  );
  if (!recipientUserPrivateDocData) {
    console.error(
      "Could not retrieve the recipient's private document data. The recipient is likely deleted, aborting."
    );
    return;
  }

  const recipientUserPublicDocData = /** @type {UserPublic} */ (
    (await db.collection('users').doc(recipientId).get()).data()
  );
  if (!recipientUserPublicDocData) {
    console.error("Could not retrieve the recipient's public document data. Aborting.");
    return;
  }

  const recipientEmailPreferences = recipientUserPrivateDocData.emailPreferences;

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

    await recipientUserPrivateDocRef.collection('unreads').doc(chatId).set({
      notifiedAt: FieldValue.serverTimestamp(),
      chatId
    });
    const baseUrl = removeEndingSlash(functions.config().frontend.url);

    const nameParts = sender.displayName.split(/[^A-Za-z-]/);
    const messageUrl = `${baseUrl}/chat/${normalizeName(nameParts[0])}/${chatId}`;

    const commonPayload = {
      senderName: sender.displayName ?? '',
      message: normalizeMessage(message.content),
      messageUrl,
      superfan: recipientUserPublicDocData.superfan ?? false,
      language: recipientUserPrivateDocData.communicationLanguage ?? 'en'
    };

    if (!recipient.email || !recipient.displayName) {
      console.error(`Email or display name of ${recipientId} are not valid`);
      fail('internal');
    }

    // Send email
    await sendMessageReceivedEmail({
      ...commonPayload,
      email: recipient.email,
      firstName: recipient.displayName
    });

    // Send a notification to all registered devices via FCM

    const pushRegistrationRef = /** @type {PushRegistrationColRef} */ (
      recipientUserPrivateDocRef.collection('push-registrations')
    );
    const pushRegistrations = (await pushRegistrationRef.get()).docs.map((d) => d.data());

    await Promise.all(
      pushRegistrations
        .filter((pR) => pR.status === 'active')
        .map((pR) =>
          sendNotification({
            ...commonPayload,
            fcmToken: pR.fcmToken
          })
        )
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
