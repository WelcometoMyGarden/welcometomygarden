// This test requires the Auth, Firestore and Functions emulators
const assert = require('node:assert');
const { Timestamp } = require('firebase-admin/firestore');
const { clearAuth, clearFirestore } = require('./util');
const { createNewUser, createGarden, createChat, sendMessage } = require('../seeders/util');
const { faker } = require('@faker-js/faker');
const { setTimeout } = require('node:timers/promises');

describe('messageReminderEmail', () => {
  let sender;
  let host;

  beforeEach(async () => {
    // Seed 1 test member
    // Superfan, no garden
    sender = await createNewUser(
      { email: 'user1@slowby.travel' },
      {
        firstName: 'Urbain',
        lastName: 'Servranckx',
        countryCode: 'BE',
        superfan: true,
        communicationLanguage: 'en',
        reference: null
      }
    );

    // Create one host
    host = await createNewUser(
      { email: `host@slowby.travel` },
      {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        countryCode: faker.location.countryCode('alpha-2'),
        communicationLanguage: faker.location.language().alpha2,
        reference: null
      }
    ).then((user) =>
      createGarden(
        {
          latitude: faker.location.latitude(),
          longitude: faker.location.longitude()
        },
        user,
        { description: faker.commerce.productDescription() }
      )
    );

    // clear relevant emails
    await fetch(`${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=messageReminderEmail`, {
      method: 'DELETE'
    });
  });

  afterEach(async () => {
    await clearAuth();
    await clearFirestore();
  });

  it('sends a reminder email after 24 hours', async () => {
    // Set up the chat, backdate it 24 hours
    const now = Date.now();
    const h24Ago = now - 24 * 3600 * 1000;
    const ts24Ago = Timestamp.fromMillis(h24Ago);
    // This will trigger an instant check due to the scheduling bug https://github.com/firebase/firebase-tools/issues/8254
    const chatId = await createChat(sender.uid, host.uid, 'Hello, test message', true, {
      // We need firebase-admin Timestamps here, even though the type is using frontend Timestamps
      // @ts-ignore
      createdAt: ts24Ago,
      // @ts-ignore
      lastActivity: ts24Ago
    });
    // send another message in the chat to test message combinations
    await sendMessage(sender.uid, chatId, "Here's another message that I forgot");
    await setTimeout(20000, 'waiting a bit for the scheduled check to run');
    // Check if there is one messageReminderEmail email
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=messageReminderEmail`
    ).then((r) => r.json());
    assert(messages.length === 1);
  }).timeout(0);

  it('does NOT send a reminder email when the schedule is somehow triggered at 12 hours later', async () => {
    // Set up the chat, backdate it 12 hours
    const now = Date.now();
    const h12Ago = now - 12 * 3600 * 1000;
    const ts12Ago = Timestamp.fromMillis(h12Ago);
    await createChat(sender.uid, host.uid, 'Hello, test message', true, {
      // We need firebase-admin Timestamps here, even though the type is using frontend Timestamps
      // @ts-ignore
      createdAt: ts12Ago,
      // @ts-ignore
      lastActivity: ts12Ago
    });
    // This will trigger an instant check due to the scheduling bug https://github.com/firebase/firebase-tools/issues/8254
    await setTimeout(10000, 'waiting a bit for the scheduled check to run');
    // Check if there are no messageReminderEmail emails
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=messageReminderEmail`
    ).then((r) => r.json());
    assert(messages.length === 0);
  }).timeout(0);

  it('does NOT send a reminder email when the chat was answered', async () => {
    // Set up the chat, backdate it 24 hours
    const now = Date.now();
    const h24Ago = now - 24 * 3600 * 1000;
    const ts24Ago = Timestamp.fromMillis(h24Ago);
    // This will trigger an instant check due to the scheduling bug https://github.com/firebase/firebase-tools/issues/8254
    // NOTE: Due to the bug this may be flaky, because the reminder check should only run AFTER the reply from the host was
    // processed
    const chatId = await createChat(sender.uid, host.uid, 'Hello, test message', true, {
      // We need firebase-admin Timestamps here, even though the type is using frontend Timestamps
      // @ts-ignore
      createdAt: ts24Ago,
      // @ts-ignore
      lastActivity: ts24Ago
    });
    // send another message in the chat to test message combinations
    await sendMessage(sender.uid, chatId, "Here's another message that I forgot");
    await sendMessage(host.uid, chatId, "Here's my reply!");
    await setTimeout(10000, 'waiting a bit for the scheduled check to run');
    // Check if there are no messageReminderEmail emails
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=messageReminderEmail`
    ).then((r) => r.json());
    assert(messages.length === 0);
  }).timeout(0);
});
