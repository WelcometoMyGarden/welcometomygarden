const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { auth, db } = require('./app');
const { pick } = require('lodash');

/**
 * @param {import('firebase-admin/auth').CreateRequest} authProps - passed to auth.createUser
 * @param {Partial<import('../../src/lib/api/functions').CreateUserRequest> & {superfan?: boolean}} callableProps - replicating what is passed to the createUser callable (and more)
 */
exports.createNewUser = async (authProps, callableProps) => {
  const user = await auth.createUser({
    emailVerified: true,
    password: '12345678',
    displayName: callableProps.firstName,
    ...authProps
  });

  // based on auth.js -> createUser

  const publicProps = pick(callableProps, ['countryCode', 'firstName', 'savedGardens', 'superfan']);

  await db
    .collection('users')
    .doc(user.uid)
    .set({
      ...publicProps,
      countryCode: callableProps.countryCode,
      firstName: callableProps.firstName
    });

  const privateProps = pick(callableProps, [
    'lastName',
    'consentedAt',
    'emailPreferences',
    'sendgridId',
    'communicationLanguage',
    'creationLanguage',
    'stripeCustomerId',
    'stripeSubscription',
    'newEmail',
    'oldEmail',
    'reference',
    'latestSpamAlertAt'
  ]);

  await db
    .collection('users-private')
    .doc(user.uid)
    .set({
      ...privateProps,
      lastName: callableProps.lastName,
      consentedAt: FieldValue.serverTimestamp(),
      emailPreferences: {
        newChat: true,
        news: true
      }
    });

  await db
    .collection('stats')
    .doc('users')
    .set({ count: FieldValue.increment(1) }, { merge: true });

  return user;
};

/**
 * @param {string} uid
 * @param {Garden} data
 */
const createGardenDoc = async (uid, data) => {
  await db.collection('campsites').doc(uid).set(data);
};

/**
 * Based on src/lib/api/chat.ts -> create
 * @param {string} uid1
 * @param {string} uid2
 * @param {string} message
 * @param {boolean} [useLastMessageSeen]
 * @returns {Promise<string>} chatId
 */
exports.createChat = async (uid1, uid2, message, useLastMessageSeen = true) => {
  const chatCollection = db.collection('chats');

  const docRef = await chatCollection.add({
    users: [uid1, uid2],
    createdAt: Timestamp.now(),
    lastActivity: Timestamp.now(),
    lastMessage: message.trim(),
    ...(useLastMessageSeen
      ? {
          lastMessageSeen: false,
          lastMessageSender: uid1
        }
      : {})
  });

  const chatMessagesCollection = db.collection(`chats/${docRef.id}/messages`);

  await chatMessagesCollection.add({
    content: message,
    createdAt: Timestamp.now(),
    from: uid1
  });

  return docRef.id;
};

/**
 * based on src/lib/api/chat.ts -> sendmessage
 * @param {string} currentUserId
 * @param {string} chatId
 * @param {string} message
 * @param {boolean} [useLastMessageSeen]
 */
exports.sendMessage = async (currentUserId, chatId, message, useLastMessageSeen = true) => {
  const chatRef = db.collection('chats').doc(chatId);
  const chatMessagesCollection = chatRef.collection('messages');

  const msg = await chatMessagesCollection.add({
    content: message.trim(),
    createdAt: Timestamp.now(),
    from: currentUserId
  });

  await chatRef.update({
    lastActivity: Timestamp.now(),
    lastMessage: message.trim(),
    ...(useLastMessageSeen
      ? {
          lastMessageSeen: false,
          lastMessageSender: currentUserId
        }
      : {})
  });

  return msg.id;
};

/**
 * Creates the garden for the user, and returns the user back.
 * @param {*} param0
 * @param {*} user
 * @param {*} extraProps
 * @returns
 */
exports.createGarden = async ({ latitude, longitude }, user, extraProps) => {
  await createGardenDoc(user.uid, {
    description: 'Hello, this is a test camping spot. You are welcome to stay!',
    location: {
      latitude,
      longitude
    },
    facilities: {
      capacity: 2,
      toilet: true,
      shower: false,
      electricity: true,
      water: false,
      drinkableWater: true,
      bonfire: true,
      tent: true
    },
    photo: null,
    listed: true,
    ...extraProps
  });
  return user;
};
