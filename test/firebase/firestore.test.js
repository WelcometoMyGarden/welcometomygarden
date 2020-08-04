const { setup, teardown } = require('./helpers');

describe('Security rules', () => {
  afterEach(async () => {
    await teardown();
  });

  test('should allow adding a valid campsite', async () => {
    const uid = 'userId';
    const db = await setup({ uid, email_verified: true });

    const campsite = {
      description: 'Testing testing testing testing',
      location: {
        latitude: 1,
        longitude: 179.532714843749574
      },
      facilities: {
        capacity: 1,
        tent: false,
        shower: false,
        electricity: false,
        bonfire: false,
        toilet: false,
        drinkableWater: false,
        water: false
      },
      photo: {}
    };
    const writeOperation = db.collection('campsites').doc(uid).set(campsite);
    await expect(writeOperation).toAllow();
  });
});
