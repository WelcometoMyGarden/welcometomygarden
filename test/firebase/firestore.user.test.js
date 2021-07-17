const { setup, teardown } = require('./helpers');
const { createUser, createPrivateUser } = require('./fixtures/user');

describe('Security rules', () => {
  afterEach(async () => {
    await teardown();
  });

  /* User creation should happen via cloud function only */
  test('should not allow direct user creation', async () => {
    const uid = 'userId1';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid)
        }
      }
    );

    const user = createUser('userId2');

    let writeOperation = db.collection('users').add(user);
    await expect(writeOperation).toDeny();
  });

  test('should allow user update', async () => {
    const uid = 'userId1';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid)
        }
      }
    );

    let writeOperation = db.collection('users').doc(uid).update({ countryCode: 'US' });
    await expect(writeOperation).toAllow();
  });

  test('should allow user emailPreferences update', async () => {
    const uid = 'userId1';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid)
        },
        'users-private': {
          [uid]: createPrivateUser(uid)
        }
      }
    );

    let writeOperation = db
      .collection('users-private')
      .doc(uid)
      .update({ 'emailPreferences.newChat': false });
    await expect(writeOperation).toAllow();

    writeOperation = db
      .collection('users-private')
      .doc(uid)
      .update({ 'emailPreferences.news': true });
    await expect(writeOperation).toAllow();
  });

  test('should not allow user update for another user', async () => {
    const uid = 'userId1';
    const uid2 = 'userId2';
    const db = await setup(
      { uid, email_verified: true },
      {
        users: {
          [uid]: createUser(uid),
          [uid2]: createUser(uid)
        }
      }
    );

    let writeOperation = db.collection('users').doc(uid2).update({ countryCode: 'US' });
    await expect(writeOperation).toDeny();
  });
});
