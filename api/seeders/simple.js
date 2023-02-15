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
 * @param {import('firebase-admin/auth').CreateRequest} authProps
 * @param {import('../../src/lib/api/functions').CreateUserRequest} callableProps
 */
const createNewUser = async (authProps, callableProps) => {
  const user = await auth.createUser({
    emailVerified: true,
    password: '12345678',
    displayName: callableProps.firstName,
    ...authProps
  });

  // based on auth.js -> createUser

  await db.collection('users').doc(user.uid).set({
    countryCode: callableProps.countryCode,
    firstName: callableProps.firstName
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
 * Based on src/lib/api/chat.ts -> create
 * @param {string} uid1
 * @param {string} uid2
 * @param {string} message
 * @returns {Promise<string>} chatId
 */
const createChat = async (uid1, uid2, message) => {
  const chatCollection = db.collection('chats');

  const docRef = await chatCollection.add({
    users: [uid1, uid2],
    createdAt: Timestamp.now(),
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
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
 */
const sendMessage = async (currentUserId, chatId, message) => {
  const chatRef = db.collection('chats').doc(chatId);
  const chatMessagesCollection = chatRef.collection('messages');

  const msg = await chatMessagesCollection.add({
    content: message.trim(),
    createdAt: Timestamp.now(),
    from: currentUserId
  });

  await chatRef.update({
    lastActivity: Timestamp.now(),
    lastMessage: message.trim()
  });

  return msg.id;
};

const seed = async () => {
  // Seed two users
  const user1 = await createNewUser(
    { email: 'user1@slowby.travel' },
    { firstName: 'Bob', lastName: 'Dylan', countryCode: 'US' }
  );

  const user2 = await createNewUser(
    { email: 'user2@slowby.travel' },
    { firstName: 'Urbain', lastName: 'Servranckx', countryCode: 'BE' }
  );

  // Send chats
  // TODO messages are sent without gardens being created, this is not realistic
  // from 1 to 2
  const chatId = await createChat(user1.uid, user2.uid, 'Hey, can I stay in your garden?');
  for (let i = 0; i < 10; i += 1) {
    const even = i % 2 === 0;
    // eslint-disable-next-line no-await-in-loop
    await sendMessage((even ? user2 : user1).uid, chatId, faker.lorem.sentences());
  }

  const user3 = await createNewUser(
    {
      email: 'user3@slowby.travel'
    },
    { firstName: 'Maria Louise', lastName: 'from Austria', countryCode: 'AT' }
  );

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
