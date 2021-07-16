const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
  createUser,
  requestPasswordReset,
  resendAccountVerification,
  cleanupUserOnDelete
} = require('./auth');
const { onMessageCreate, onChatCreate } = require('./chat');

admin.initializeApp();

exports.createUser = functions.https.onCall(createUser);
exports.requestPasswordReset = functions.https.onCall(requestPasswordReset);
exports.resendAccountVerification = functions.https.onCall(resendAccountVerification);

exports.onChatCreate = functions.firestore.document('chats/{chatId}').onCreate(onChatCreate);
exports.notifyOnChat = functions.firestore
  .document('chats/{chatId}/{messages}/{messageId}')
  .onCreate(onMessageCreate);

exports.onUserCreate = functions.auth.user().onCreate(onUserCreate);
exports.cleanupUserOnDelete = functions.auth.user().onDelete(cleanupUserOnDelete);
