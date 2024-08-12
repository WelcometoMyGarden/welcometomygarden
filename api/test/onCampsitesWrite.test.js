const assert = require('node:assert');
const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../seeders/app');
const { clearAuth, clearFirestore, wait } = require('./util');
const { createNewUser, createGarden } = require('../seeders/util');

// Note: this behavior requires replication to be "on"
describe('onCampsitesWrite', () => {
  let user1;
  let campsiteDocRef;

  const waitForTriggersTimeout = 5000;

  beforeEach(async () => {
    // Seed a single test user
    user1 = await createNewUser(
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
    );
    campsiteDocRef = db.collection('campsites').doc(user1.uid);
  });

  const totalTimeout = waitForTriggersTimeout + 2000;

  it('auto-updates the listed change time when the user unlists or relists their garden', async () => {
    // No listed change should be defined, yet
    assert(typeof (await (await campsiteDocRef.get()).data().latestListedChangeAt) === 'undefined');

    // Unlist the garden
    await campsiteDocRef.update({ listed: false });

    // Wait for firestore triggers to pass
    await wait(waitForTriggersTimeout);

    const { latestListedChangeAt } = (await campsiteDocRef.get()).data();

    // Check if a date was set
    assert(latestListedChangeAt instanceof Timestamp);

    // Re-list
    await campsiteDocRef.update({ listed: true });
    await wait(waitForTriggersTimeout);

    // Check if  updated again
    const { latestListedChangeAt: secondTimestamp } = (await campsiteDocRef.get()).data();
    assert(latestListedChangeAt.valueOf() < secondTimestamp.valueOf());
  }).timeout(totalTimeout * 2);

  it('has a listed change time exactly equal to the removal time, when manually unlisted', async () => {
    // Remove by force
    await campsiteDocRef.update({ latestRemovedAt: Timestamp.now(), listed: false });

    await wait(waitForTriggersTimeout);

    // Check equality
    const data = /** @type{import('../../src/lib/types/Garden').Garden} */ (
      (await campsiteDocRef.get()).data()
    );
    assert(data.latestRemovedAt.valueOf() === data.latestListedChangeAt.valueOf());
  }).timeout(totalTimeout);

  afterEach(async () => {
    await clearAuth();
    await clearFirestore();
  });
});
