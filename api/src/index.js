const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
  createUser,
  requestPasswordReset,
  resendAccountVerification,
  cleanupUserOnDelete
} = require('./auth');
const { onChatCreate } = require('./chat');
const { doBackup } = require('./storage');

admin.initializeApp();

exports.createUser = functions.https.onCall(createUser);
exports.requestPasswordReset = functions.https.onCall(requestPasswordReset);
exports.resendAccountVerification = functions.https.onCall(resendAccountVerification);
exports.cleanupUserOnDelete = functions.auth.user().onDelete(cleanupUserOnDelete);

exports.notifyOnChat = functions.firestore
  .document('chats/{chatId}/{messages}/{messageId}')
  .onCreate(onChatCreate);

exports.scheduledFirestoreBackup = functions.pubsub.schedule('every 6 hours').onRun(doBackup);
