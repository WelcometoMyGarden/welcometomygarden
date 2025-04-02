const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { sendMessageReceivedEmail, sendSpamAlertEmail } = require('./mail');
const { auth, db, getFunctionUrl } = require('./firebase');
const { sendNotification } = require('./push');
const fail = require('./util/fail');
const { supabase } = require('./supabase');
const { getFunctions } = require('firebase-admin/functions');
const { FirebaseMessagingError } = require('firebase-admin/messaging');
const { normalizeMessage, buildMessageUrl } = require('./util/mail');
const { shouldReplicateRuntime } = require('./sharedConfig');

exports.MAX_MESSAGE_LENGTH = 800;

/**
 * @typedef {CollectionReference<PushRegistration>} PushRegistrationColRef
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

/**
 * Sends an email notification of a new chat to a recipient, if the recipient
 * wishes to receive email notifications and has not received a notification about the
 * chat yet very recently.
 *
 * @param {FirestoreEvent<QueryDocumentSnapshot<import('../../src/lib/types/Chat').FirebaseMessage>,
 * { chatId: string; messages: string; messageId: string; }>} snap
 * @returns {Promise<any>}
 */
exports.onMessageCreate = async ({ data: snap, params }) => {
  const message = snap.data();
  const senderId = message.from;
  const { chatId } = params;

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
    logger.warn(
      "Could not retrieve the recipient's private document data. The recipient is likely deleted, aborting.",
      {
        messageId: snap.id,
        recipientId
      }
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

    const commonPayload = {
      senderName: senderAuthUser.displayName ?? '',
      message: normalizeMessage(message.content),
      messageUrl: buildMessageUrl(senderAuthUser.displayName, chatId),
      superfan: recipientUserPublicDocData.superfan ?? false,
      language: recipientUserPrivateDocData.communicationLanguage ?? 'en'
    };
    //
    // In any case: send a notification to all registered devices via FCM
    try {
      const pushRegistrationRef = /** @type {PushRegistrationColRef} */ (
        recipientUserPrivateDocRef.collection('push-registrations')
      );
      const pushRegistrations = (await pushRegistrationRef.get()).docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));

      await Promise.all(
        pushRegistrations
          .filter((pR) => pR.status === 'active')
          .map(async ({ id, host, fcmToken }) => {
            try {
              return await sendNotification({
                ...commonPayload,
                // Override the messageUrl with the host from the push registration, so it also works for beta.welcometomygarden.org.
                // Firebase's JS SDK filters out non-matching hosts on click events in their service worker code
                // probably with reason, because: https://developer.mozilla.org/en-US/docs/Web/API/Clients/openWindow#parameters :
                //   > A string representing the URL of the client you want to open in the window.
                //   > **Generally this value must be a URL from the same origin as the calling script.**
                messageUrl: buildMessageUrl(senderAuthUser.displayName, chatId, host),
                fcmToken
              });
            } catch (pushNotificationError) {
              if (
                pushNotificationError instanceof FirebaseMessagingError &&
                pushNotificationError.code === 'messaging/registration-token-not-registered'
              ) {
                // https://firebase.google.com/docs/cloud-messaging/manage-tokens#detect-invalid-token-responses-from-the-fcm-backend
                // "warn" because this is an expected, fairly normal error condition
                logger.warn(
                  'FCM token registration error after trying to send a push notification',
                  {
                    id,
                    recipientId: recipientAuthUser.uid,
                    fcmToken
                  }
                );
                // TODO: remove this registration? Let's try to see if we can leverage the endpoint directly?
                try {
                  // Mark this registration as errored
                  /** @type {DocumentReference<PushRegistration>} */ (
                    await db
                      .collection('users-private')
                      .doc(recipientAuthUser.uid)
                      .collection('push-registrations')
                      .doc(id)
                  ).update({
                    status: /** @type {PushRegistrationStatus} */ ('fcm_errored'),
                    erroredAt: Timestamp.now()
                  });
                } catch (registrationUpdateError) {
                  logger.error(
                    'Error updating a push registration to an errored status',
                    registrationUpdateError,
                    {
                      id,
                      recipientId: recipientAuthUser.uid,
                      fcmToken
                    }
                  );
                }
              } else {
                logger.error('Unknown push registration error', pushNotificationError);
              }
            }
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

/**
 * @param {FirestoreAuthEvent<QueryDocumentSnapshot<Chat>, { chatId: string; }>} event
 */
exports.onChatCreate = async ({ data: chatSnapshot }) => {
  await db
    .collection('stats')
    .doc('chats')
    .set({ count: FieldValue.increment(1) }, { merge: true });

  const chatId = chatSnapshot.id;

  //
  // To continue processing, a chat has to be created by a user
  // (always true, at least in our current system)
  //
  // TODO: authId as a param ot the event probably exists in production (and would be better to use),
  // but it is not testable https://github.com/firebase/firebase-tools/issues/7450
  const [senderAuthId, recipientAuthId] = chatSnapshot.data().users;
  if (typeof senderAuthId !== 'string') {
    fail('not-found');
  }

  // Enqueue message reminder email, if the recipient has not opted out manually (hardcoded for now)
  if (!['tgnSZm4dzpX24DZBHfIYzAvNGH02'].includes(recipientAuthId)) {
    const [resourceName, targetUri] = await getFunctionUrl('sendMessage');
    /**
     * @type {TaskQueue<QueuedMessage>}
     */
    const sendMessageQueue = getFunctions().taskQueue(resourceName);
    await sendMessageQueue.enqueue(
      {
        type: 'message_reminder',
        data: {
          chatId: chatId,
          senderUid: senderAuthId
        }
      },
      {
        scheduleDelaySeconds: 24 * 3600,
        ...(targetUri
          ? {
              uri: targetUri
            }
          : {})
      }
    );
  }

  const now = Date.now();
  const userPrivateDocRef = /** @type {DocumentReference<UserPrivate>} */ (
    db.collection('users-private').doc(senderAuthId)
  );
  const usersPrivateDoc = await userPrivateDocRef.get();
  const usersPrivateDocData = usersPrivateDoc.data();
  const canCheckForSpamActivity =
    !usersPrivateDocData.latestSpamAlertAt ||
    now - usersPrivateDocData.latestSpamAlertAt.toMillis() > 72 * 3600 * 1000;

  if (!canCheckForSpamActivity) {
    return;
  }

  // Get all the chats involving the user
  const chatsOfLast24Hours = await /** @type {CollectionReference<Chat>} */ (
    db
      .collection('chats')
      .where('createdAt', '>', Timestamp.fromMillis(now - 24 * 3600 * 1000))
      .where('users', 'array-contains', senderAuthId)
  ).get();
  const chatsCreatedByUser = chatsOfLast24Hours.docs
    .map((d) => d.data())
    .filter((d) => d.users[0] === senderAuthId);

  if (chatsCreatedByUser.length < 10) {
    return;
  }

  logger.info(
    `Sending spam alert for ${senderAuthId}, last message: ${chatSnapshot.data().lastMessage}`
  );

  const { email, displayName } = await auth.getUser(senderAuthId);

  await await Promise.all([
    sendSpamAlertEmail({
      uid: senderAuthId,
      email: email,
      firstName: displayName,
      lastName: usersPrivateDocData.lastName,
      lastMessage: chatSnapshot.data().lastMessage
    }),
    // Update the last alert timestamp
    userPrivateDocRef.update({ latestSpamAlertAt: Timestamp.now() })
  ]);
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
    const noValidUserFound = new Error('no-valid-user-found');
    try {
      return (await auth.getUserByEmail(fromEmail)).uid;
    } catch (e) {
      if (shouldReplicateRuntime() && fromEmail.match(/@(?:gmail|googlemail)\.com$/)) {
        /** @type {{error: import('@supabase/supabase-js').PostgrestError, data: Supabase.GetGmailNormalizedEmailResponse}} */
        const {
          error,
          data: { id, email, email_verified }
        } = await supabase().rpc('get_gmail_normalized_email', fromEmail);
        if (error || id == null) {
          logger.warn(
            `Email error: couldn't find the user for email address ${fromEmail} in Firebase Auth or Supabase equivalents.`
          );
          throw noValidUserFound;
        }
        // A match was found
        if (!email_verified) {
          // Note: maybe we should filter only for verified emails in the query.
          // Stll, we shouldn't end up here, because hosts shouldn't be able to add a garden without verification,
          // and travellers can't send an initial message without verification.
          logger.warn(
            `Email error: found equivalent email match (input: ${fromEmail}, canonical: ${email}) but the email wasn't verified, this shouldn't happen.`
          );
          throw noValidUserFound;
        }
        logger.info(
          `Found Gmail equivalent email via Supabase; input: ${fromEmail}, canonical: ${email}`
        );
        return id;
      }
      // No possibility to find equivalent emails, give up
      logger.warn(
        `Email error: couldn't find the user for email address ${fromEmail} using Firebase Auth`
      );
      throw noValidUserFound;
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
