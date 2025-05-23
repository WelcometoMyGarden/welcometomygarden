/* eslint-disable no-console */
// This test requires the Auth, Firestore, Storage, Extension and Functions emulators
// as well as pointing storage-resize-images.env to the local env
//
// echo "node_modules/.bin/mocha -f deleteCleanup" > runtests.sh && firebase --project demo-test emulators:exec --only auth,functions,firestore,storage --ui ./runtests.sh
const assert = require('node:assert');
const { db, auth, storage } = require('../seeders/app');
const { clearAuth, clearFirestore } = require('./util');
const { createNewUser, createChat, createGarden } = require('../seeders/util');
const { wait } = require('../src/util/time');
const { faker } = require('@faker-js/faker');
const { createReadStream } = require('node:fs');
const path = require('node:path');

const bucket = storage.bucket('demo-test.appspot.com');

/**
 *
 * @param {string} userId
 * @param {string} filePath from the project root
 * @returns
 */
async function uploadGardenPhoto(userId, filePath) {
  const sourcePath = path.resolve(__dirname, '..', filePath);
  const file = bucket.file(`gardens/${userId}/garden.jpg`);

  await db.collection('campsites').doc(userId).update({ photo: 'garden.jpg' });
  return new Promise((resolve, reject) => {
    const writeStream = file.createWriteStream({ resumable: false });
    const readStream = createReadStream(sourcePath);

    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    readStream.pipe(writeStream);
  });
}

// Note: this behavior requires replication to be "on"
describe('deleteCleanup', () => {
  let user1;
  let user2;
  let sender;
  const waitForTriggersTimeout = 5000;

  afterEach(async () => {
    await clearAuth();
    await clearFirestore();
  });

  beforeEach(async () => {
    // Seed test users
    [user1, user2, sender] = await Promise.all([
      createNewUser(
        { email: 'user1@slowby.travel' },
        { firstName: 'Test', lastName: 'Robot', countryCode: 'US' }
      ).then((user) =>
        createGarden(
          {
            latitude: 50.952798579681854,
            longitude: 4.763172541851901
          },
          user,
          {
            description: 'Hello, this is a test garden.'
          }
        )
      ),
      createNewUser(
        { email: 'user2@slowby.travel' },
        { firstName: 'Foo', lastName: 'Bar', countryCode: 'BE' }
      ).then((user) =>
        createGarden(
          {
            latitude: 21.952798579681854,
            longitude: 64.763172541851901
          },
          user,
          {
            description: 'Hello, this is a test garden.'
          }
        )
      ),
      createNewUser(
        { email: 'sender@slowby.travel' },
        {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          countryCode: faker.location.countryCode('alpha-2'),
          communicationLanguage: faker.location.language().alpha2,
          reference: null
        }
      )
    ]);

    // Upload photos
    await Promise.all([
      uploadGardenPhoto(
        user1.uid,
        '../static/images/workshops/the-1001-ways-of-slow-travelling.jpg'
      ),
      uploadGardenPhoto(
        user2.uid,
        '../static/images/workshops/the-1001-ways-of-slow-travelling.jpg'
      )
    ]);

    // Upload photo for user1
    // Send messages to user1
    await Promise.all([
      createChat(sender.uid, user1.uid, 'Hello, test message', true),
      createChat(sender.uid, user2.uid, 'Second chat test', true)
    ]);
  });

  const totalTimeout = waitForTriggersTimeout * 2 + 2000;

  it('deletes the users-private subcollections and uploaded files when deleting the user', async () => {
    // Wait until the unreads users-private subcollection is created
    console.log('Waiting for unreads collection creation');
    await wait(waitForTriggersTimeout);

    // Delete user1
    await auth.deleteUser(user1.uid);
    await wait(waitForTriggersTimeout);
    console.log('Waiting deletion triggers');

    const [user1PublicDoc, user1PrivateDoc, campsite] = await Promise.all([
      db.doc(`users/${user1.uid}`).get(),
      db.doc(`users-private/${user1.uid}`).get(),
      db.doc(`campsites/${user1.uid}`).get()
    ]);
    assert.strictEqual(user1PublicDoc.exists, true, 'User1 public document should still exist');
    assert.strictEqual(
      user1PrivateDoc.exists,
      false,
      'User1 private document should not exist anymore'
    );
    assert.strictEqual(campsite.exists, false, 'User1 campsite should not exist anymore');

    // Check whether there is still an unreads doc around
    const snapshots = await db.collection(`users-private/${user1.uid}/unreads`).listDocuments();
    assert.strictEqual(snapshots.length, 0, 'No subcollection documents should exist anymore');

    // Check if the photo was deleted
    const file = bucket.file(`gardens/${user1.uid}/garden.jpg`);
    const [exists] = await file.exists();
    assert.strictEqual(exists, false, 'Garden photo should be deleted');
    //
    // ========================
    // This part of the test serves as a precaution against the unlikely, but very scary, mistake
    // where accidentally forgetting a userId specification in a recursive delete
    // of firestore or storage results in a deletion of unintended documents
    // ========================
    //

    // Check if user2's data still exists
    const [user2PublicDoc, user2PrivateDoc, campsite2] = await Promise.all([
      db.doc(`users/${user2.uid}`).get(),
      db.doc(`users-private/${user2.uid}`).get(),
      db.doc(`campsites/${user2.uid}`).get()
    ]);
    assert.strictEqual(user2PublicDoc.exists, true, 'User2 document should still exist');
    assert.strictEqual(user2PrivateDoc.exists, true, 'User2 document should still exist');
    assert.strictEqual(campsite2.exists, true, 'User2 campsite should still exist');
    const user2PublicData = user2PublicDoc.data();
    const user2PrivateData = user2PrivateDoc.data();
    assert.strictEqual(user2PublicData.firstName, 'Foo');
    assert.strictEqual(user2PublicData.countryCode, 'BE');
    assert.strictEqual(user2PrivateData.lastName, 'Bar');
    // Check if the photo was deleted
    const file2 = bucket.file(`gardens/${user2.uid}/garden.jpg`);
    const [exists2] = await file2.exists();
    assert.strictEqual(exists2, true, 'Garden photo should still exist');
  }).timeout(totalTimeout);
});
