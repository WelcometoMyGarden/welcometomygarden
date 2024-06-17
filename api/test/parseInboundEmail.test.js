const assert = require('node:assert');
const simpleSeed = require('../seeders/simple');
const { db } = require('../seeders/app');
const { createChat } = require('../seeders/util');
const { sendMessageFromEmail } = require('../src/chat');
const { clearAuth, clearFirestore } = require('./util');

const pauseForManualCheck = async () => {
  this.timeout(0);
  await new Promise((res, rej) => setTimeout(() => res, 10 * 60 * 1000));
};

describe('the server-side message sending function `sendMessageFromEmail` ', () => {
  let seedResult;
  let secondChatId;
  beforeEach(async () => {
    seedResult = await simpleSeed();
    let {
      chats: [, sCI]
    } = seedResult;
    secondChatId = sCI;
  });

  const validTestMessage = 'This is an email response function test';

  it('sends a valid message correctly', async function () {
    await sendMessageFromEmail({
      chatId: secondChatId,
      fromEmail: 'user1@slowby.travel',
      message: validTestMessage
    });

    const lastMessage = (
      await db.collection(`chats/${secondChatId}/messages`).orderBy('createdAt', 'desc').get()
    ).docs[0];

    // The message was sent
    assert.strictEqual(lastMessage.data().content, validTestMessage);

    // For a manual test/check
    // await pauseForManualCheck()
  });

  it('throws when a non-existent email is used', async function () {
    await assert.rejects(
      sendMessageFromEmail({
        chatId: secondChatId,
        fromEmail: 'nonexistentuser@slowby.travel',
        message: validTestMessage
      })
    );
  });

  it('throws when an existing chat ID is used that the user is not part of ', async () => {
    let {
      users: [, user2, user3],
      chats: [firstChatId]
    } = seedResult;
    const thirdChatId = await createChat(user2.uid, user3.uid, 'This is a chat between user 2 & 3');

    await assert.rejects(
      sendMessageFromEmail({
        chatId: thirdChatId,
        // User 1 is not part of the chat between user 2 & 3
        fromEmail: 'user1@slowby.travel',
        message: validTestMessage
      })
    );
  });

  it('throws on a non-existent chat ID', async () => {
    await assert.rejects(
      sendMessageFromEmail({
        fromEmail: 'user1@slowby.travel',
        chatId: 'thiscantexist',
        message: validTestMessage
      })
    );
  });

  afterEach(async () => {
    await clearAuth();
    await clearFirestore();
  });
});
