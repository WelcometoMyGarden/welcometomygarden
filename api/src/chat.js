// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { config, logger } = require('firebase-functions');
const removeDiacritics = require('./util/removeDiacritics');
const { sendMessageReceivedEmail } = require('./mail');
const removeEndingSlash = require('./util/removeEndingSlash');
const { auth, db } = require('./firebase');
const { sendNotification } = require('./push');
const fail = require('./util/fail');
const supabase = require('./supabase');

const { shouldReplicate } = require('./sharedConfig');

exports.MAX_MESSAGE_LENGTH = 800;

/**
 * @typedef {import("../../src/lib/models/User").UserPrivate} UserPrivate
 * @typedef {import("../../src/lib/models/User").UserPublic} UserPublic
 * @typedef {import("../../src/lib/types/Chat").LocalChat} LocalChat
 * @typedef {import("../../src/lib/types/PushRegistration.ts").FirebasePushRegistration} FirebasePushRegistration
 */
/**
 * @typedef {import("firebase-admin/firestore").CollectionReference<FirebasePushRegistration>} PushRegistrationColRef
 */

const getChat = async (chatId) => {
  const doc = await db.collection('chats').doc(chatId).get();
  if (!doc.exists) {
    throw new Error(`Email error: the chat with ID ${chatId} doesn't exist`);
  }
  const chat = doc.data();
  return /** @type {LocalChat} */ ({
    id: doc.id,
    ...chat
  });
};

const normalizeMessage = (str) => str.replace(/\n\s*\n\s*\n/g, '\n\n');
const normalizeName = (str) => removeDiacritics(str).toLowerCase();

/**
 * Sends an email notification of a new chat to a recipient, if the recipient
 * wishes to receive email notifications and has not received a notification about the
 * chat yet very recently.
 * @param {import("@google-cloud/firestore").QueryDocumentSnapshot<import('../../src/lib/types/Chat').FirebaseMessage>} snap
 * @returns {Promise<any>}
 */
exports.onMessageCreate = async (snap, context) => {
  const message = snap.data();
  const senderId = message.from;
  const { chatId } = context.params;

  const chat = await getChat(chatId);

  const recipientId = chat.users.find((uid) => senderId !== uid);
  if (!recipientId) {
    logger.error(`Couldn't find the UID of the recipient of message ${snap.id} in chat ${chat.id}`);
    return;
  }
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
    logger.error(
      "Could not retrieve the recipient's private document data. The recipient is likely deleted, aborting."
    );
    return;
  }

  const recipientUserPublicDocData = /** @type {UserPublic} */ (
    (await db.collection('users').doc(recipientId).get()).data()
  );
  if (!recipientUserPublicDocData) {
    logger.error("Could not retrieve the recipient's public document data. Aborting.");
    return;
  }

  const recipientEmailPreferences = recipientUserPrivateDocData.emailPreferences;

  // Determine whether an email should be sent,
  // based on user preferences + recency
  /** @type {boolean} */
  let shouldNotifyEmail = recipientEmailPreferences.newChat || true;
  if (shouldNotifyEmail && unreadDoc.exists) {
    const unread = unreadDoc.data();
    const nowDate = new Date();
    // Elapsed time since last email notification in milliseconds
    const elapsedTime = nowDate.getTime() - unread.notifiedAt.toMillis();
    // user was notified in the last 5 mins
    if (elapsedTime / 60000 <= 5) {
      shouldNotifyEmail = false;
    }
  }

  // Send email and/or push notifications
  try {
    const recipientAuthUser = await auth.getUser(recipientId);

    if (!recipientAuthUser.email || !recipientAuthUser.displayName) {
      logger.error(`Email or display name of ${recipientId} are not valid`);
      fail('internal');
    }

    const senderAuthUser = await auth.getUser(senderId);

    if (!senderAuthUser || !senderAuthUser.displayName) {
      logger.error(`Sender auth user ${senderId} or its displayName is undefined/null`);
      fail('internal');
    }

    const baseUrl = removeEndingSlash(config().frontend.url);

    const senderNameParts = senderAuthUser.displayName.split(/[^A-Za-z-]/);
    const messageUrl = `${baseUrl}/chat/${normalizeName(senderNameParts[0])}/${chatId}`;

    const commonPayload = {
      senderName: senderAuthUser.displayName ?? '',
      message: normalizeMessage(message.content),
      messageUrl,
      superfan: recipientUserPublicDocData.superfan ?? false,
      language: recipientUserPrivateDocData.communicationLanguage ?? 'en'
    };
    //
    // In any case: send a notification to all registered devices via FCM
    try {
      const pushRegistrationRef = /** @type {PushRegistrationColRef} */ (
        recipientUserPrivateDocRef.collection('push-registrations')
      );
      const pushRegistrations = (await pushRegistrationRef.get()).docs.map((d) => d.data());

      await Promise.all(
        pushRegistrations
          .filter((pR) => pR.status === 'active')
          .map(({ host, fcmToken }) => {
            return sendNotification({
              ...commonPayload,
              // Override the messageUrl with the host from the push registration, so it also works for beta.welcometomygarden.org.
              // Firebase's JS SDK filters out non-matching hosts on click events in their service worker code
              // probably with reason, because: https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow#parameters :
              //   > A string representing the URL of the client you want to open in the window.
              //   > **Generally this value must be a URL from the same origin as the calling script.**
              messageUrl: `https://${host}/chat/${normalizeName(senderNameParts[0])}/${chatId}`,
              fcmToken
            });
          })
      );
    } catch (ex) {
      logger.error('Error while sending push notification: ', ex);
    }

    // Send email, if the last email wasn't sent too recently
    if (shouldNotifyEmail) {
      try {
        // Mark new email activity, to determine email recency next time
        await recipientUserPrivateDocRef.collection('unreads').doc(chatId).set({
          notifiedAt: FieldValue.serverTimestamp(),
          chatId
        });

        await sendMessageReceivedEmail({
          ...commonPayload,
          email: recipientAuthUser.email,
          firstName: recipientAuthUser.displayName
        });
      } catch (ex) {
        logger.error('Error while sending email notification: ', ex);
      }
    }
  } catch (ex) {
    logger.error(ex);
  }
};

exports.onChatCreate = async () => {
  await db
    .collection('stats')
    .doc('chats')
    .set({ count: FieldValue.increment(1) }, { merge: true });
};

/**
 * Server-side API for sending a new message. Emulates the client-side API, but can
 * for now only be used to respond to existing chats. Assumes the message length is already checked.
 *
 * Note: the fromEmail should be verified, message can't be undefined.
 * @param {{chatId: string, message: string, fromEmail: string}} params
 */
exports.sendMessageFromEmail = async function sendMessageFromEmail(params) {
  const { chatId, message, fromEmail: fromEmailRaw } = params;

  const fromEmail = fromEmailRaw.toLowerCase();
  const chatRef = `chats/${chatId}`;

  const getUserId = async () => {
    try {
      return (await auth.getUserByEmail(fromEmail)).uid;
    } catch (e) {
      if (shouldReplicate && fromEmail.match(/@(?:gmail|googlemail)\.com$/)) {
        /** @type {{error: import('@supabase/supabase-js').PostgrestError, data: Supabase.GetGmailNormalizedEmailResponse}} */
        const {
          error,
          data: { id, email, email_verified }
        } = await supabase.rpc('get_gmail_normalized_email', fromEmail);
        if (error || id == null) {
          logger.error(
            `Email error: couldn't find the user for email address ${fromEmail} in Firebase Auth or Supabase equivalents.`
          );
          throw error;
        }
        // A match was found
        if (!email_verified) {
          // Note: maybe we should filter only for verified emails in the query.
          // Stll, we shouldn't end up here, because hosts shouldn't be able to add a garden without verification,
          // and travellers can't send an initial message without verification.
          logger.error(
            `Email error: found equivalent email match (input: ${fromEmail}, canonical: ${email}) but the email wasn't verified, this shouldn't happen.`
          );
          throw new Error('Unverified equivalent email');
        }
        logger.info(
          `Found Gmail equivalent email via Supabase; input: ${fromEmail}, canonical: ${email}`
        );
        return id;
      }
      // No possibility to find equivalent emails, give up
      logger.error(
        `Email error: couldn't find the user for email address ${fromEmail} using Firebase Auth`
      );
      throw e;
    }
  };

  // Fetch the user & chat concurrently
  const [fromUserId, chat] = await Promise.all([getUserId(), getChat(chatId)]);

  // Verify that the user is in the chat (to prevent maliciously spoofed/modified email)
  const userIsInChat = chat.users.find((uid) => fromUserId === uid);
  if (!userIsInChat) {
    throw new Error(
      `Email error: The user ${fromUserId} matching the 'from' email address ${fromEmail} is not part of the chat ${chatId}`
    );
  }

  // Send message
  await db.collection(`${chatRef}/messages`).doc().create({
    content: message,
    createdAt: Timestamp.now(),
    from: fromUserId
  });

  await db.doc(chatRef).update({
    lastActivity: Timestamp.now(),
    lastMessage: message,
    lastMessageSeen: false,
    lastMessageSender: fromUserId
  });
};
