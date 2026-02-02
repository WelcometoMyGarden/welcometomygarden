/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
// This integration test requires mailpit to be running, as well
// the Auth, Firestore and Functions emulators
const { faker } = require('@faker-js/faker');
const assert = require('node:assert');
const { createNewUser, createGarden, createChat } = require('../seeders/util');
const { clearAuth, clearFirestore, clearEmails } = require('./util/util');
const { wait } = require('../src/util/time');
const { db } = require('../seeders/app');
const { Timestamp } = require('firebase-admin/firestore');

const maxChats = 100;
const perHostWait = 500;
const belowChatLimit = Math.floor(maxChats / 1.5);

describe('chatBlock', () => {
  let hosts = [];
  let sender;
  let secondMember;

  before(async function () {
    this.timeout(maxChats * perHostWait + 10000);
    console.debug('SETTING UP TEST ENV');
    await clearAuth();
    await clearFirestore();
    await wait(100);

    // clear all emails
    await clearEmails();

    console.debug(`Seeding ${maxChats} hosts (+ 1 extra)`);
    // Seed hostsToCreate hosts + 1 uncontacted for manual front-end tests
    const creationCalls = new Array(maxChats + 1).fill(1).map((_, i) => {
      const hostNo = i + 1;
      return () =>
        createNewUser(
          { email: `host${hostNo}@slowby.travel` },
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
    });

    let i = 1;
    for (const createHost of creationCalls) {
      console.log(`Creating host ${i++}`);
      hosts.push(await createHost());
      await wait(perHostWait);
    }

    console.log(`Last uncontacted host id for manual testing: ${hosts[maxChats].uid}`);

    // Seed two test members
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

    secondMember = await createNewUser(
      { email: 'user2@slowby.travel' },
      {
        firstName: 'Test2',
        lastName: 'Reset',
        countryCode: 'BE',
        superfan: true,
        communicationLanguage: 'fr'
      }
    );
  });

  it('blocks a user from sending new chats when they send 100 within 24 hours', async () => {
    console.debug('SEND INITIAL MESSAGES');
    // send initial messages
    for (let i = 0; i < maxChats - 1; i++) {
      await createChat(sender.uid, hosts[i].uid, faker.lorem.sentences(2));
      await wait(perHostWait / 3);
    }

    // Allow time for the triggers to run
    await wait(maxChats * (perHostWait / 100));

    // Check if there is one spamAlert email
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=spamAlert`
    ).then((r) => r.json());
    assert(messages.length === 1);

    // Check that the user is NOT YET blocked, with 99 messages
    assert(
      await db
        .collection('users-meta')
        .doc(sender.uid)
        .get()
        .then((d) => d.data().chatBlockedAt == null && d.data().chatWindowCount === maxChats - 1)
        .catch((e) => {
          console.error('Error while checking the block state of the user', e);
          return false;
        })
    );

    console.debug('SENDING THE 100TH MESSAGE');

    const msg100 = 'This is my 100th message';

    // Try sending a 100th message as an admin
    await createChat(sender.uid, hosts[maxChats - 1].uid, msg100);
    // Wait for triggers
    await wait(2000);
    // Check that the user is blocked
    assert(
      await db
        .collection('users-meta')
        .doc(sender.uid)
        .get()
        .then((d) => d.data().chatBlockedAt != null && d.data().chatWindowCount === maxChats)
        .catch((e) => {
          console.error('Error while checking the block state of the user', e);
          return false;
        })
    );

    //
    // Check if there is one chatBlocked email
    const { messages: chatBlockedMessages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=chatBlocked`
    ).then((r) => r.json());
    assert(chatBlockedMessages.length === 1);
  }).timeout(0);

  it('resets the analysis window when less than the max number of chats were sent and a new chat comes in', async () => {
    await clearEmails();

    // set the second member to be the sender
    sender = secondMember;

    await wait(500);

    // send initial messages that are older than (below limit)
    for (let i = 0; i < belowChatLimit; i++) {
      await createChat(sender.uid, hosts[i].uid, faker.lorem.sentences(2), true, {
        // @ts-ignore
        createdAt: Timestamp.fromMillis(Date.now() - 24 * 3600 * 1000)
      });
      await wait(perHostWait / 3);
    }
    // fake that the chat window started 25 hours ago
    const over24hWindowStart = Timestamp.fromMillis(Date.now() - 25 * 3600 * 1000);

    await db
      .collection('users-meta')
      .doc(sender.uid)
      .update({ chatWindowStartAt: over24hWindowStart });

    // Check that the meta doc has the expected content
    assert(
      await db
        .collection('users-meta')
        .doc(sender.uid)
        .get()
        .then(
          (d) =>
            d.data().chatWindowStartAt.valueOf() === over24hWindowStart.valueOf() &&
            d.data().chatBlockedAt == null &&
            d.data().chatWindowCount === belowChatLimit
        )
        .catch((e) => {
          console.error('Error while checking the block state of the user', e);
          return false;
        })
    );

    // Wait for triggers
    await wait(2000);

    // Create another chat
    await createChat(sender.uid, hosts[belowChatLimit].uid, 'Test reset chat');

    // Wait for triggers
    await wait(2000);

    // Check that the meta doc has reset the chat window and count
    assert(
      await db
        .collection('users-meta')
        .doc(sender.uid)
        .get()
        .then(
          (d) =>
            // A very recent window start
            d.data().chatWindowStartAt > Timestamp.fromMillis(Date.now() - 4000) &&
            // Still not blocked
            d.data().chatBlockedAt == null &&
            d.data().chatWindowCount === 1
        )
        .catch((e) => {
          console.error('Error while checking the block state of the user', e);
          return false;
        })
    );

    // No block email was sent
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=chatBlocked`
    ).then((r) => r.json());
    assert(messages.length === 0);
  }).timeout(0);
});
