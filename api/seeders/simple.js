#!/usr/bin/env node
/* eslint-disable camelcase */
// @ts-check
const admin = require('firebase-admin');
// eslint-disable-next-line import/no-extraneous-dependencies
const { faker } = require('@faker-js/faker');
const { FieldValue, Timestamp } = require('firebase-admin/firestore');

const app = admin.initializeApp({
  projectId: 'demo-test'
});
const db = admin.firestore(app);
const auth = admin.auth(app);

/**
 * @param {import('firebase-admin/auth').CreateRequest} authProps - passed to auth.createUser
 * @param {import('../../src/lib/api/functions').CreateUserRequest & {superfan?: true}} callableProps - replicating what is passed to the createUser callable
 */
const createNewUser = async (authProps, callableProps) => {
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
const createChat = async (uid1, uid2, message, useLastMessageSeen = true) => {
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
const sendMessage = async (currentUserId, chatId, message, useLastMessageSeen = true) => {
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

const createGarden = async ({ latitude, longitude }, user, extraProps) => {
  await createGardenDoc(user.uid, {
    description: 'Hello, this is a test camping spot. You are welcome to stay!',
    location: {
      latitude,
      longitude
    },
    facilities: {
      capacity: 2,
      toilets: true,
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

const seed = async () => {
  // Create users
  const [user1, user2, user3, , , user6Admin] = await Promise.all([
    // No superfan, has a garden
    createNewUser(
      { email: 'user1@slowby.travel' },
      { firstName: 'Bob', lastName: 'Dylan', countryCode: 'US' }
    ).then((user) =>
      createGarden(
        {
          latitude: 50.952798579681854,
          longitude: 4.763172541851901
        },
        user,
        {
          description:
            'Hello, this is a test garden. If you want to stay here, please send an SMS to 0679669739 or 0681483065.'
        }
      )
    ),
    // Superfan, no garden
    createNewUser(
      { email: 'user2@slowby.travel' },
      { firstName: 'Urbain', lastName: 'Servranckx', countryCode: 'BE', superfan: true }
    ),
    // Superfan, has garden
    createNewUser(
      { email: 'user3@slowby.travel' },
      { firstName: 'Jospehine', lastName: 'Delafroid', countryCode: 'FR', superfan: true }
    ).then((user) => createGarden({ latitude: 50.9427, longitude: 4.5124 }, user)),
    // No superfan, no garden, has past chats
    createNewUser(
      {
        email: 'user4@slowby.travel'
      },
      { firstName: 'Maria Louise', lastName: 'from Austria', countryCode: 'AT' }
    ),
    // No superfan, no garden, no messages
    createNewUser(
      {
        email: 'user5@slowby.travel'
      },
      { firstName: 'Laura', lastName: 'Verheyden', countryCode: 'BE' }
    ),
    // Admin user
    createNewUser(
      {
        email: 'admin@slowby.travel'
      },
      { firstName: 'Admin', lastName: 'Slowby', countryCode: 'BE' }
    )
  ]);

  // Make user 5 admin, to test admin dashboard functionality
  await auth.setCustomUserClaims(user6Admin.uid, { admin: true });

  // Send chats
  // TODO messages are sent to user 2 without that account having a garden, this is not realistic
  // initiated by 1 to 2
  const chatId = await createChat(user1.uid, user2.uid, 'Hey, can I stay in your garden?', false);
  for (let i = 0; i < 10; i += 1) {
    const even = i % 2 === 0;
    // eslint-disable-next-line no-await-in-loop
    await sendMessage((even ? user2 : user1).uid, chatId, faker.lorem.sentences(), false);
  }

  // from 3 to 1
  await createChat(user3.uid, user1.uid, 'I have a question');
};

seed();

// Prevent the emulators:exec script from exiting, which prevents the emulators from exiting
// We need the to use emulators:exec to run this script, because I suspect that one exports the Google Application Default credentials
// required to work with the Firestore.
// Some comments here suggest alternatives, but this works!
// https://stackoverflow.com/questions/61972931/problem-running-js-file-with-firebase-emulators-exec#61980766
// My method explained: https://dev.to/th0rgall/comment/24khh
//
// Method ref:
// https://stackoverflow.com/a/50873242/4973029
process.stdin.resume();

// Killing is done with Ctrl+C
