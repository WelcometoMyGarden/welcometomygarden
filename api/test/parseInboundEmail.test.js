const assert = require('node:assert');
const { readFile } = require('node:fs/promises');
const { resolve } = require('node:path');
const simpleSeed = require('../seeders/simple');
const { db } = require('../seeders/app');
const { createChat } = require('../seeders/util');
const { sendMessageFromEmail } = require('../src/chat');
const { clearAuth, clearFirestore } = require('./util');
const { parseUnpackedInboundEmail } = require('../src/sendgrid/parseInboundEmail');

const pauseForManualCheck = async () => {
  this.timeout(0);
  await new Promise((res, rej) => setTimeout(() => res, 10 * 60 * 1000));
};

describe('the server-side message sending function `sendMessageFromEmail` ', () => {
  let seedResult;
  let secondChatId;
  beforeEach(async () => {
    seedResult = await simpleSeed();
    const {
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
    const {
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

describe('the inbound email parser', () => {
  it('correctly parses a well-formatted plaintext email without HTML text', async () => {
    const parsed = parseUnpackedInboundEmail({
      text: `All good. Im there already. Take your time

Welcome To My Garden <support@welcometomygarden.org> schrieb am Di., 18.
Juni 2024, 18:56:

> Hi Christopher!
>
> Alex has sent you a message on Welcome To My Garden
> <https://welcometomygarden.org>. You can reply via *chat on the website*
> <https://welcometomygarden.org/chat>. Please don't reply to this email,
> otherwise the person who contacted you can’t read your message.
> "Hi Christopher. We are a bit late. We are 6 km away. 🙈"
> Reply to Wheels On Tour
> <https://welcometomygarden.org/chat/alex/ea2SDFfsea213eafsf>
>
> Slowly yours,
>
>
> *The WTMG team *Follow WTMG on *Facebook*
> <https://www.facebook.com/Welcome2mygarden> or *Instagram*
> <https://www.instagram.com/welcometomygarden_org/>
> Sent with 💚 by Welcome To My Garden
> <https://mc.sendgrid.com/dynamic-templates/somesendgridlink>
> *Address: 100 Rue Van Bortonne, 1090 Jette, Belgium*
> Would you rather not receive emails from us? *Unsubscribe*
> <https://welcometomygarden.org/account>.
>`,
      from: 'Alex Test <testemail@gmail.com>',
      envelope: '{"to":["reply@parse.testparse"],"from":"testemail@gmail.com"}',
      dkim: '{@gmail.com : pass}',
      sender_ip: '209.85.208.46'
    });

    assert.strictEqual(
      // TODO: this pass actually shows a Crisp parser limitation
      parsed.responseText,
      `All good. Im there already. Take your time

Welcome To My Garden <support@welcometomygarden.org> schrieb am Di., 18.
Juni 2024, 18:56:`
    );

    assert.strictEqual(parsed.chatId, 'ea2SDFfsea213eafsf');
  });

  it('correctly parses a HTML email without plaintext', async () => {
    const parsed = parseUnpackedInboundEmail({
      html: await readFile(resolve(__dirname, 'input/240619_12_04.html'), 'utf-8'),
      from: 'Alex Test <testemail@gmail.com>',
      envelope: '{"to":["reply@parse.testparse"],"from":"testemail@gmail.com"}',
      dkim: '{@gmail.com : pass}',
      sender_ip: '209.85.208.46'
    });

    // TODO: shows a Crisp parser limitation
    assert.strictEqual(
      parsed.responseText,
      `Hoi
Ik ben nu in IJsland. We moeten even afstemmen wat jullie willen. Sanitair en zo.
Ik ben ook niet zo vaak thuis dan. Want TAZ 😀
TestHost

Verstuurd vanaf mijn iPhone`
    );
    assert.strictEqual(parsed.chatId, '59sd12zTmJJhDFSQfP');
  });
});
