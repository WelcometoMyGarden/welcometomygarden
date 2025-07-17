/* eslint-disable no-await-in-loop */
// This integration test requires mailpit to be running, as well
// the Auth, Firestore and Functions emulators
const { faker } = require('@faker-js/faker');
const assert = require('node:assert');
const { createNewUser, createGarden, createChat } = require('../seeders/util');
const { clearAuth, clearFirestore } = require('./util');
const { default: fetch } = require('node-fetch');
const { wait } = require('../src/util/time');

describe('spamAlert', () => {
  let hosts;
  let sender;

  before(async () => {
    // Seed 11 hosts
    const creationPromises = new Array(11).fill(1).map((_, i) => {
      const hostNo = i + 1;
      return createNewUser(
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

    hosts = await Promise.all(creationPromises);

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

    // clear relevant emails
    await fetch(`${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=spamAlert`, {
      method: 'DELETE'
    });
  });

  after(async () => {
    await clearAuth();
    await clearFirestore();
  });

  it('the server sends a message when a user sends more 10 or more messages within 24 hours', async () => {
    // send 10 messages
    for (let i = 0; i < 11; i++) {
      await createChat(sender.uid, hosts[i].uid, faker.lorem.sentences(2));
      await wait(500);
    }

    // Allow time for the triggers to run
    await wait(10000);

    // Check if there is one spamAlert email
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=spamAlert`
    ).then((r) => r.json());
    assert(messages.length === 1);
  }).timeout(0);

  it("doesn't send another spam alert after the 11th new chat", async () => {
    await createChat(sender.uid, hosts[10].uid, faker.lorem.sentences(2));
    // Allow time for the triggers to run
    await wait(3000);
    // Check if there is *still* only one spamAlert email
    const { messages } = await fetch(
      `${process.env.LOCAL_EMAIL_HOST}/api/v1/search?query=spamAlert`
    ).then((r) => r.json());
    assert(messages.length === 1);
  }).timeout(0);
});
