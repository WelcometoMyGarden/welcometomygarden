// This test requires the Auth, Firestore and Functions emulators
const assert = require('node:assert');
const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../seeders/app');
const { clearAuth, clearFirestore } = require('./util/util');
const { createNewUser } = require('../seeders/util');
const { wait } = require('../src/util/time');

describe('onPushRegistrationWrite', () => {
  let user;
  /**
   * @type {CollectionReference<PushRegistration>}
   */
  let pushRegistrationsRef;

  const waitForTriggersTimeout = 7000;
  const totalTimeout = waitForTriggersTimeout * 2 + 2000;

  beforeEach(async () => {
    user = await createNewUser(
      { email: 'user1@slowby.travel' },
      { firstName: 'Test', lastName: 'User', countryCode: 'BE' }
    );
    pushRegistrationsRef =
      /**
       * @type {CollectionReference<PushRegistration>}
       */ (db.collection(`users-private/${user.uid}/push-registrations`));
  });

  afterEach(async () => {
    await clearAuth();
    await clearFirestore();
  });

  it('marks existing web push registrations for deletion when a native push registration is added', async () => {
    const commonFields = {
      fcmToken: 'test-fcm-token',
      ua: { os: 'Linux', browser: 'Chrome', device: {} },
      createdAt: Timestamp.now(),
      refreshedAt: Timestamp.now()
    };

    // Create two web push registrations
    const [webRef1, webRef2] = await Promise.all([
      pushRegistrationsRef.add({
        ...commonFields,
        fcmToken: 'web-fcm-token-1',
        status: 'active',
        subscription: { endpoint: 'https://example.com/push/1', keys: {} },
        host: 'welcometomygarden.org'
      }),
      pushRegistrationsRef.add({
        ...commonFields,
        fcmToken: 'web-fcm-token-2',
        status: 'active',
        subscription: { endpoint: 'https://example.com/push/2', keys: {} },
        host: 'welcometomygarden.org'
      })
    ]);

    const NATIVE_FCM_TOKEN = 'native-fcm-token';
    // Add a native push registration — this should trigger the function
    await pushRegistrationsRef.add({
      ...commonFields,
      fcmToken: NATIVE_FCM_TOKEN,
      status: 'active',
      deviceId: 'test-device-id-abc123',
      ua: { os: 'Android', browser: null, device: {} }
    });

    // Wait for Firestore trigger to complete
    await wait(waitForTriggersTimeout);

    const [snap1, snap2] = await Promise.all([webRef1.get(), webRef2.get()]);

    assert.strictEqual(
      snap1.data().status,
      'marked_for_deletion',
      'First web push registration should be marked for deletion'
    );
    assert.strictEqual(
      snap2.data().status,
      'marked_for_deletion',
      'Second web push registration should be marked for deletion'
    );
    // Wait for Firestore trigger to complete
    await wait(waitForTriggersTimeout);

    assert.strictEqual(
      snap1.data().status,
      'marked_for_deletion',
      'First web push registration should be marked for deletion'
    );
    assert.strictEqual(
      snap2.data().status,
      'marked_for_deletion',
      'Second web push registration should be marked for deletion'
    );

    // Check that the native push registration is still present and active
    const allRegistrations = await pushRegistrationsRef.get();
    const nativeReg = allRegistrations.docs.find((doc) => doc.data().fcmToken === NATIVE_FCM_TOKEN);
    assert.ok(nativeReg, 'Native push registration should still be present');
    assert.strictEqual(
      nativeReg.data().status,
      'active',
      'Native push registration should still be active'
    );
  }).timeout(totalTimeout);

  describe('restoring the newChat email preference', () => {
    const nativeRegistration = {
      fcmToken: 'native-fcm-token',
      deviceId: 'test-device-id-abc123',
      status: 'active',
      ua: { os: 'Android', browser: null, device: {} },
      createdAt: Timestamp.now(),
      refreshedAt: Timestamp.now()
    };

    /** @returns {DocumentReference<UserPrivate>} */
    const userPrivateRef = () =>
      /** @type {DocumentReference<UserPrivate>} */ (db.collection('users-private').doc(user.uid));

    /** @returns {Promise<boolean | undefined>} */
    const getNewChatPreference = async () =>
      (await userPrivateRef().get()).data()?.emailPreferences?.newChat;

    beforeEach(async () => {
      // Opting out is only possible with an active mobile registration, so start from
      // the state the frontend would have allowed.
      await userPrivateRef().update({ 'emailPreferences.newChat': false });
    });

    it('keeps newChat off while an active mobile push registration remains', async () => {
      await pushRegistrationsRef.add(nativeRegistration);
      await wait(waitForTriggersTimeout);

      assert.strictEqual(
        await getNewChatPreference(),
        false,
        'newChat should stay off while the user is reachable on mobile'
      );
    }).timeout(totalTimeout);

    it('restores newChat when the last active mobile registration is deactivated', async () => {
      const registrationRef = await pushRegistrationsRef.add(nativeRegistration);
      await wait(waitForTriggersTimeout);

      await registrationRef.update({ status: 'marked_for_deletion' });
      await wait(waitForTriggersTimeout);

      assert.strictEqual(
        await getNewChatPreference(),
        true,
        'newChat should be restored when no active mobile registration is left'
      );
    }).timeout(totalTimeout * 2);

    it('restores newChat when the last mobile registration is deleted', async () => {
      const registrationRef = await pushRegistrationsRef.add(nativeRegistration);
      await wait(waitForTriggersTimeout);

      await registrationRef.delete();
      await wait(waitForTriggersTimeout);

      assert.strictEqual(
        await getNewChatPreference(),
        true,
        'newChat should be restored when the registration is gone'
      );
    }).timeout(totalTimeout * 2);

    it('restores newChat for a user who only ever had web push', async () => {
      await pushRegistrationsRef.add({
        fcmToken: 'web-fcm-token-1',
        status: 'active',
        subscription: { endpoint: 'https://example.com/push/1', keys: {} },
        host: 'welcometomygarden.org',
        ua: { os: 'Linux', browser: 'Chrome', device: {} },
        createdAt: Timestamp.now(),
        refreshedAt: Timestamp.now()
      });
      await wait(waitForTriggersTimeout);

      assert.strictEqual(
        await getNewChatPreference(),
        true,
        'web push does not count as a mobile push registration'
      );
    }).timeout(totalTimeout);
  });
});
