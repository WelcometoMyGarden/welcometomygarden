const admin = require('firebase-admin');
// eslint-disable-next-line import/no-extraneous-dependencies

let app;
if (!admin.apps.length) {
  app = admin.initializeApp({
    projectId: process.env.STAGING ? 'wtmg-dev' : 'demo-test'
  });
} else {
  [app] = admin.apps;
}
const db = admin.firestore(app);
const auth = admin.auth(app);
const storage = admin.storage(app);

module.exports = { app, db, auth, storage };
