// eslint-disable-next-line import/no-unresolved
const { FieldValue, Timestamp } = require('firebase-admin/firestore');
const { auth, db } = require('./app');

/**
 * @param {import('firebase-admin/auth').CreateRequest} authProps - passed to auth.createUser
 * @param {import('../../src/lib/api/functions').CreateUserRequest & {superfan?: boolean}} callableProps - replicating what is passed to the createUser callable (and more)
 */
exports.createNewUser = async (authProps, callableProps) => {
  const user = await auth.createUser({
    emailVerified: true,
    password: '12345678',
    displayName: callableProps.firstName,
    ...authProps
  });

  // based on auth.js -> createUser

  await db
    .collection('users')
    .doc(user.uid)
    .set({
      countryCode: callableProps.countryCode,
      firstName: callableProps.firstName,
      ...(callableProps.superfan ? { superfan: callableProps.superfan } : {})
    });

  await db
    .collection('users-private')
    .doc(user.uid)
    .set({
      lastName: callableProps.lastName,
      consentedAt: FieldValue.serverTimestamp(),
      emailPreferences: {
        newChat: true,
        news: true
      },
      ...(callableProps.stripeSubscription
        ? { stripeSubscription: callableProps.stripeSubscription }
        : {}),
      ...(callableProps.communicationLanguage
        ? { communicationLanguage: callableProps.communicationLanguage }
        : {})
    });

  await db
    .collection('stats')
    .doc('users')
    .set({ count: FieldValue.increment(1) }, { merge: true });

  return user;
};

/**
 * @param {string} uid
 * @param {import('../../src/lib/types/Garden').Garden} data
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
