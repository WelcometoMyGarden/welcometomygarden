const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
  createUser,
  requestPasswordReset,
  resendAccountVerification,
  cleanupUserOnDelete,
  setAdminRole,
  verifyEmail,
  updateEmail
} = require('./auth');
const { onMessageCreate, onChatCreate } = require('./chat');
const { onCampsiteCreate, onCampsiteDelete } = require('./campsites');
const { exportNewsletterEmails } = require('./mail');

admin.initializeApp();

exports.requestPasswordReset = functions.https.onCall(requestPasswordReset);
exports.resendAccountVerification = functions.https.onCall(resendAccountVerification);

exports.onChatCreate = functions.firestore.document('chats/{chatId}').onCreate(onChatCreate);
exports.notifyOnChat = functions.firestore
  .document('chats/{chatId}/{messages}/{messageId}')
  .onCreate(onMessageCreate);

exports.createUser = functions.https.onCall(createUser);
exports.cleanupUserOnDelete = functions.auth.user().onDelete(cleanupUserOnDelete);
exports.setAdminRole = functions.https.onCall(setAdminRole);
exports.verifyEmail = functions.https.onCall(verifyEmail);
exports.updateEmail = functions.https.onCall(updateEmail);

exports.onCampsiteCreate = functions.firestore
  .document('campsites/{campsiteId}')
  .onCreate(onCampsiteCreate);
exports.onCampsiteDelete = functions.firestore
  .document('campsites/{campsiteId}')
  .onDelete(onCampsiteDelete);

exports.exportNewsletterEmails = functions.https.onCall(exportNewsletterEmails);
