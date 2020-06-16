const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createUser, requestPasswordReset, resendAccountVerification } = require('./auth');

admin.initializeApp();

exports.createUser = functions.https.onCall(createUser);
exports.requestPasswordReset = functions.https.onCall(requestPasswordReset);
exports.resendAccountVerification = functions.https.onCall(resendAccountVerification);
