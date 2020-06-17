/* 
 * Reference
 * https://fireship.io/lessons/testing-firestore-security-rules-with-the-emulator/
 */
const fire = require('@firebase/testing')
const fs = require('fs')
const init = async (auth, data) => {
  const projectId = `wtmg-test-${Date.now()}`

  const firebase = await fire.initializeTestApp({
    projectId,
    auth
  })

  const db = firebase.firestore()

  if (data) {
    for (const key in data) {
     const ref = db.doc(key)
     await ref.set()
    }
  }

  await fire.loadFirestoreRules({
    projectId,
    rules: fs.readFileSync('firestore.rules', 'utf8')
  })

  return db
}

expect.extend({
    async toAllow(test) {
          let pass = false;
          try {
                  await fire.assertSucceeds(test);
                  pass = true;
                } catch (error) {
                  throw new Error(error) 
                }

          return {
                  pass,
                  message: () => 'Expected Firebase operation to be allowed, but it was denied'
                };
        }
});

expect.extend({
    async toDeny(test) {
          let pass = false;
          try {
                  await fire.assertFails(test);
                  pass = true;
                } catch (error) {
                  throw new Error(error)
                }
          return {
                  pass,
                  message: () =>
                    'Expected Firebase operation to be denied, but it was allowed'
                };
        }
});

const teardown = async () => Promise.all(fire.apps().map(firebase => firebase.delete()))

module.exports.init = init
module.exports.teardown = teardown
