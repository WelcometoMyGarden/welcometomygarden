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
      photo: null
    };
    const writeOperation = db.collection('campsites').doc(uid).set(campsite);
    await expect(writeOperation).toAllow();
  });

  test('should allow updating a campsite', async () => {
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
      photo: null
    };
    await db.collection('campsites').doc(uid).set(campsite);

    const writeOperation = db
      .collection('campsites')
      .doc(uid)
      .update({
        description: 'Lorem ipsum or something',
        location: {
          latitude: 50.627168274108385,
          longitude: 4.52319322899001
        },
        facilities: {
          capacity: 4,
          tent: false,
          shower: false,
          electricity: true,
          bonfire: false,
          toilet: true,
          drinkableWater: false,
          water: true
        },
        listed: true,
        photo: null,
        id: 'kbLD11pDnkfBfWMeC9gkyV8WGsY2'
      });
    await expect(writeOperation).toAllow();
  });
});
