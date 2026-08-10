const { config } = require('dotenv');
// firebase-admin 14 removed the legacy `admin.*` namespace; use the modular APIs
// (mirrors api/src/firebase.js).
const { getApps, getApp, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

config({ path: 'api/.env.local', quiet: true });

if (!process.env.STAGING) {
  config({ path: 'api/.env.test.local', quiet: true });
}

const app = getApps().length
  ? getApp()
  : initializeApp({
      projectId: process.env.STAGING ? 'wtmg-dev' : 'demo-test'
    });

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

module.exports = { app, db, auth, storage };
