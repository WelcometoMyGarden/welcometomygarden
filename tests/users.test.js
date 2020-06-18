const { init, teardown } = require('./init');

describe('Collection - users', () => {
  afterAll(async () => {
    await teardown();
  });

  /*
   * Create
   */

  test('Lock create on "users" collection', async () => {
    const db = await init();
    const ref = db.collection('users');
    await expect(ref.add({ firstName: 'Donna' })).toDeny();
  });

  test('Lock create on "users-private" collection', async () => {
    const db = await init();
    const ref = db.collection('users-private');
    await expect(ref.add({ lastName: 'Manning' })).toDeny();
  });

  /*
   * Read
   */

  test('Allow anyone to read any public user information', async () => {
    const db = await init();
    const ref = db.collection('users');
    await expect(ref.get()).toAllow();
  });

  test('Do not allow anyone to read any private user information', async () => {
    const db = await init();
    const ref = db.collection('users-private');
    await expect(ref.get()).toDeny();
  });

  test('Allow user to read own public information', async () => {
    const db = await init({ uid: 'Bob' });
    const ref = db.collection('users');
    const profile = ref.doc('Bob');
    await expect(profile.get()).toAllow();
  });

  test('Allow user to read own private information', async () => {
    const db = await init({ uid: 'Bob' });
    const ref = db.collection('users-private');
    const profile = ref.doc('Bob');
    await expect(profile.get()).toAllow();
  });

  test("Do not allow user to read other's private information", async () => {
    const db = await init({ uid: 'Bob' });
    const ref = db.collection('users-private');
    const profile = ref.doc('Taylor');
    await expect(profile.get()).toDeny();
  });
});
