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
    pushRegistrationsRef = /**
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
});
