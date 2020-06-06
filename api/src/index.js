const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createUser, resetPassword, changeEmail } = require('./auth');

admin.initializeApp();

exports.createUser = functions.https.onCall(createUser);
