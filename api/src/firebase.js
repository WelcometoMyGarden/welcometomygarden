const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const db = getFirestore();
exports.db = db;
const auth = getAuth();
exports.auth = auth;
