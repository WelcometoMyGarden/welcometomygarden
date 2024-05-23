#!/usr/bin/env node
/* eslint-disable camelcase */

// eslint-disable-next-line import/no-extraneous-dependencies
const { faker } = require('@faker-js/faker');
// eslint-disable-next-line import/no-unresolved

const { auth } = require('./app');
const { createNewUser, createGarden, createChat, sendMessage } = require('./util');

const seed = async () => {
  // Create users
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
      { firstName: 'Jospehine', lastName: 'Delafroid', countryCode: 'FR', superfan: true }
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
  seed();
  //
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
}
