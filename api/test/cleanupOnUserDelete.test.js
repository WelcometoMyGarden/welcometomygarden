const { faker } = require('@faker-js/faker');
const { auth } = require('../seeders/app');
const { campsitesDoc, usersMetaDoc } = require('../src/collections');
const { createNewUser, createGarden } = require('../seeders/util');
const { clearAuth, clearFirestore } = require('./util/util');
const { wait } = require('../src/util/time');
const assert = require('node:assert');
const { Timestamp } = require('firebase-admin/firestore');

describe('deleteFirebaseData', () => {
  before(async function () {
    await clearAuth();
    await clearFirestore();
    await wait(100);
  });

  it('deletes the campsite and sets deletion time', async () => {
    // Seed a single test user
    const user1 = await createNewUser(
      { email: 'user1@slowby.travel' },
      {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        countryCode: faker.location.countryCode()
      }
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
    );

    const campsiteDocRef = campsitesDoc(user1.uid);

    // Wait for triggers
    await wait(1000);

    // Do the the deletion
    await auth.deleteUser(user1.uid);

    // Wait for triggers
    await wait(2000);

    // Checks
    const campiteDoc = await campsiteDocRef.get();
    // The campsite doc does not exist anymore
    assert(!campiteDoc.exists);
    const metaDoc = await usersMetaDoc(user1.uid);
    // The deletedAt timestamp was set
    assert((await metaDoc.get()).data().deletedAt instanceof Timestamp);
  }).timeout(10 * 1000);
});
