const firebase = require('@firebase/testing');
const fs = require('fs');

exports.setup = async (auth, data) => {
  // Create a unique projectId for every firebase simulated app
  const projectId = `rules-spec-${Date.now()}`;

  const app = await firebase.initializeTestApp({
    projectId,
    auth
  });

  const db = app.firestore();

  // Apply test rules so we can write documents
  await firebase.loadFirestoreRules({
    projectId,
    rules: fs.readFileSync('firestore-test.rules', 'utf8')
  });

  // Write mock documents with test rules
  if (data) {
    for (const [collectionName, collections] of Object.entries(data)) {
      for (const [documentId, doc] of Object.entries(collections)) {
        await db.collection(collectionName).doc(documentId).set(doc);
      }
    }
  }

  await firebase.loadFirestoreRules({
    projectId,
    rules: fs.readFileSync('firestore.rules', 'utf8')
  });

  // return the initialised DB for testing
  return db;
};

exports.teardown = async () => {
  // Delete all apps currently running in the firebase simulated environment
  Promise.all(firebase.apps().map((app) => app.delete()));
};

expect.extend({
  async toAllow(testPromise) {
    let pass = false;
    try {
      await firebase.assertSucceeds(testPromise);
      pass = true;
    } catch (err) {
      console.log(err);
    }

    return {
      pass,
      message: () => 'Expected Firebase operation to be allowed, but it was denied'
    };
  }
});

expect.extend({
  async toDeny(testPromise) {
    let pass = false;
    try {
      await firebase.assertFails(testPromise);
      pass = true;
    } catch (err) {
      console.log(err);
    }
    return {
      pass,
      message: () => 'Expected Firebase operation to be denied, but it was allowed'
    };
  }
});
