const { setup, teardown } = require('./helpers');
const firebase = require('@firebase/testing');
const { createUser } = require('./fixtures/user');

describe('Security rules', () => {
  afterEach(async () => {
    await teardown();
  });

  test('should read chat if user is participant', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2)
        }
      }
    );

    const chat = {
      users: [uid, uid2],
      createdAt: firebase.firestore.Timestamp.now(),
      lastActivity: firebase.firestore.Timestamp.now(),
      lastMessage: firebase.firestore.Timestamp.now()
    };

    const ref = await db.collection('chats').add(chat);

    let writeOperation = db.collection('chats').doc(ref.id).get();
    await expect(writeOperation).toAllow();
  });

  test('should not read chat if not a participant', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const uid3 = 'userId3';
    const chatId = 'chatId';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2),
          [uid3]: createUser(uid3)
        },
        chats: {
          [chatId]: {
            users: [uid2, uid3],
            createdAt: firebase.firestore.Timestamp.now(),
            lastActivity: firebase.firestore.Timestamp.now(),
            lastMessage: firebase.firestore.Timestamp.now()
          }
        }
      }
    );

    const writeOperation = db.collection('chats').doc(chatId).get();
    await expect(writeOperation).toAllow();
  });

  test('should create chat', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2)
        }
      }
    );

    const chat = {
      users: [uid, uid2],
      createdAt: firebase.firestore.Timestamp.now(),
      lastActivity: firebase.firestore.Timestamp.now(),
      lastMessage: firebase.firestore.Timestamp.now()
    };

    const writeOperation = db.collection('chats').add(chat);
    await expect(writeOperation).toAllow();
  });

  test('should not read chat if the creating user is not a participant', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const uid3 = 'userId3';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid2]: createUser(uid),
          [uid3]: createUser(uid3)
        }
      }
    );

    const chat = {
      users: [uid2, uid3],
      createdAt: firebase.firestore.Timestamp.now(),
      lastActivity: firebase.firestore.Timestamp.now(),
      lastMessage: firebase.firestore.Timestamp.now()
    };

    const writeOperation = db.collection('chats').add(chat);
    await expect(writeOperation).toDeny();
  });

  test('should not create chat if a one of the users does not exist', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid)
        }
      }
    );

    const chat = {
      users: [uid, uid2],
      createdAt: firebase.firestore.Timestamp.now(),
      lastActivity: firebase.firestore.Timestamp.now(),
      lastMessage: firebase.firestore.Timestamp.now()
    };

    const writeOperation = db.collection('chats').add(chat);
    await expect(writeOperation).toDeny();
  });

  test('should not create chat if an invalid amount of users is passed one of the users does not exist', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2)
        }
      }
    );

    const chat = {
      users: [uid],
      createdAt: firebase.firestore.Timestamp.now(),
      lastActivity: firebase.firestore.Timestamp.now(),
      lastMessage: firebase.firestore.Timestamp.now()
    };

    const writeOperation = db.collection('chats').add(chat);
    await expect(writeOperation).toDeny();
  });

  test('should add message to chat', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const chatId = 'chatId';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2)
        },
        chats: {
          [chatId]: {
            users: [uid, uid2],
            createdAt: firebase.firestore.Timestamp.now(),
            lastActivity: firebase.firestore.Timestamp.now(),
            lastMessage: firebase.firestore.Timestamp.now()
          }
        }
      }
    );

    const message = {
      content: "Hey what's up",
      createdAt: firebase.firestore.Timestamp.now(),
      from: uid
    };

    const writeOperation = db.collection('chats').doc(chatId).collection('messages').add(message);
    await expect(writeOperation).toAllow();
  });

  test('should not add a message to chat if not a participant', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const uid3 = 'userId3';
    const chatId = 'chatId';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2),
          [uid3]: createUser(uid3)
        },
        chats: {
          [chatId]: {
            users: [uid2, uid3],
            createdAt: firebase.firestore.Timestamp.now(),
            lastActivity: firebase.firestore.Timestamp.now(),
            lastMessage: firebase.firestore.Timestamp.now()
          }
        }
      }
    );

    const message = {
      content: "Hey what's up",
      createdAt: firebase.firestore.Timestamp.now(),
      from: uid
    };

    const writeOperation = db.collection('chats').doc(chatId).collection('messages').add(message);
    await expect(writeOperation).toDeny();
  });

  test('should not add a message if it is over 500 characters', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const chatId = 'chatId';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2)
        },
        chats: {
          [chatId]: {
            users: [uid2, uid],
            createdAt: firebase.firestore.Timestamp.now(),
            lastActivity: firebase.firestore.Timestamp.now(),
            lastMessage: firebase.firestore.Timestamp.now()
          }
        }
      }
    );

    let message = {
      content:
        'exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 characters exactly 500 chara',
      createdAt: firebase.firestore.Timestamp.now(),
      from: uid
    };

    let writeOperation = db.collection('chats').doc(chatId).collection('messages').add(message);
    await expect(writeOperation).toAllow();

    message = {
      content:
        'exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 characters exactly 501 charac',
      createdAt: firebase.firestore.Timestamp.now(),
      from: uid
    };
    writeOperation = db.collection('chats').doc(chatId).collection('messages').add(message);
    await expect(writeOperation).toDeny();
  });

  test('should read a message', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const chatId = 'chatId';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2)
        },
        chats: {
          [chatId]: {
            users: [uid, uid2],
            createdAt: firebase.firestore.Timestamp.now(),
            lastActivity: firebase.firestore.Timestamp.now(),
            lastMessage: firebase.firestore.Timestamp.now(),
            messages: {
              ['messageId']: 'hi'
            }
          }
        }
      }
    );

    const writeOperation = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc('messageId')
      .get();

    await expect(writeOperation).toAllow();
  });

  test('should not read a message if not a participant', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const uid3 = 'userId3';
    const chatId = 'chatId';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid2),
          [uid3]: createUser(uid3)
        },
        chats: {
          [chatId]: {
            users: [uid2, uid3],
            createdAt: firebase.firestore.Timestamp.now(),
            lastActivity: firebase.firestore.Timestamp.now(),
            lastMessage: firebase.firestore.Timestamp.now(),
            messages: {
              ['messageId']: 'hi'
            }
          }
        }
      }
    );

    const writeOperation = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc('messageId')
      .get();

    await expect(writeOperation).toDeny();
  });
});
