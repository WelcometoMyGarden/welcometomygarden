#!/usr/bin/env node

// eslint-disable-next-line import/no-extraneous-dependencies
const { faker } = require('@faker-js/faker');
const { auth } = require('./app');
const { createNewUser, createGarden, createChat, sendMessage } = require('./util');
const { config } = require('dotenv');

config({ path: 'api/.env.local', quiet: true });

const seed = async () => {
  // Create users
  const oneMonthAgoEpoch = Math.floor(Date.now() / 1000) - 31 * 24 * 1000;
  const users = await Promise.all([
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
      /** @satisfies {Partial<User>}*/
      ({
        firstName: 'Jospehine',
        lastName: 'Delafroid',
        countryCode: 'FR',
        superfan: true,
        stripeSubscription: {
          startDate: oneMonthAgoEpoch,
          currentPeriodStart: oneMonthAgoEpoch,
          currentPeriodEnd: oneMonthAgoEpoch + 365 * 24 * 1000,
          id: 'sample-stripe-subscription',
          priceId: process.env.STRIPE_PRICE_IDS_NORMAL,
          status: 'active',
          latestInvoiceStatus: 'paid',
          cancelAt: null,
          canceledAt: null,
          renewalInvoiceLink: null,
          collectionMethod: 'charge_automatically'
        }
      })
    ).then((user) => createGarden({ latitude: 50.9427, longitude: 4.5124 }, user)),
    // No superfan, no garden, has past chats (TODO)
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
    ),
    // Extra gardens in Europe (Innsbruck, Munich, Vienna, Zurich, Lyon)
    createNewUser(
      { email: 'innsbruck@slowby.travel' },
      { firstName: 'Anna', lastName: 'Berg', countryCode: 'AT' }
    ).then((user) =>
      createGarden(
        { latitude: 47.2692, longitude: 11.4041 },
        user,
        { description: 'Small garden near Innsbruck old town. Quiet, with view of the Nordkette.' }
      )
    ),
    createNewUser(
      { email: 'munich@slowby.travel' },
      { firstName: 'Thomas', lastName: 'Müller', countryCode: 'DE' }
    ).then((user) =>
      createGarden(
        { latitude: 48.1351, longitude: 11.582 },
        user,
        { description: 'Garden in Munich. Easy reach of S-Bahn. Bike available for guests.' }
      )
    ),
    createNewUser(
      { email: 'vienna@slowby.travel' },
      { firstName: 'Elena', lastName: 'Hofmann', countryCode: 'AT' }
    ).then((user) =>
      createGarden(
        { latitude: 48.2082, longitude: 16.3738 },
        user,
        { description: 'Green spot in Vienna. Tram stop nearby. Welcome, slow travellers!' }
      )
    ),
    createNewUser(
      { email: 'zurich@slowby.travel' },
      { firstName: 'Marco', lastName: 'Steiner', countryCode: 'CH' }
    ).then((user) =>
      createGarden(
        { latitude: 47.3769, longitude: 8.5417 },
        user,
        { description: 'Garden by the lake. Quiet neighbourhood, 15 min to Hauptbahnhof.' }
      )
    ),
    createNewUser(
      { email: 'lyon@slowby.travel' },
      { firstName: 'Claire', lastName: 'Bernard', countryCode: 'FR' }
    ).then((user) =>
      createGarden(
        { latitude: 45.764, longitude: 4.8357 },
        user,
        { description: 'Jardin à Lyon. Proche des quais du Rhône. Une place pour tente ou van.' }
      )
    ),
    createNewUser(
      { email: 'florence@slowby.travel' },
      { firstName: 'Giulia', lastName: 'Rossi', countryCode: 'IT' }
    ).then((user) =>
      createGarden(
        { latitude: 43.7696, longitude: 11.2558 },
        user,
        { description: 'Piccolo giardino a Firenze, a pochi minuti dal centro. Benvenuti viaggiatori lenti!' }
      )
    )
  ]);

  const [user1, user2, user3, , , user6Admin] = users;

  // Make user 5 admin, to test admin dashboard functionality
  await auth.setCustomUserClaims(user6Admin.uid, { admin: true });

  // Send chats
  // TODO messages are sent to user 2 without that account having a garden, this is not realistic
  // initiated by 1 to 2
  const firstChatId = await createChat(
    user1.uid,
    user2.uid,
    'Hey, can I stay in your garden?',
    false
  );
  for (let i = 0; i < 10; i += 1) {
    const even = i % 2 === 0;
    // eslint-disable-next-line no-await-in-loop
    await sendMessage((even ? user2 : user1).uid, firstChatId, faker.lorem.sentences(), false);
  }

  // from 3 to 1
  const secondChatId = await createChat(user3.uid, user1.uid, 'I have a question');

  return {
    users,
    chats: [firstChatId, secondChatId]
  };
};

module.exports = seed;

if (require.main === module) {
  seed().then(() => process.exit(0));
}
