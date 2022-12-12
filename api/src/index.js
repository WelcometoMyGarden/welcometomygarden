const { initializeApp } = require('firebase-admin/app')
initializeApp();

const functions = require('firebase-functions');
const {
  createUser,
  requestPasswordReset,
  resendAccountVerification,
  cleanupUserOnDelete,
  setAdminRole,
  verifyEmail,
  updateEmail
} = require('./auth');
const { doBackup } = require('./storage');
const { onMessageCreate, onChatCreate } = require('./chat');
const { onCampsiteCreate, onCampsiteDelete } = require('./campsites');
const { exportNewsletterEmails } = require('./mail');
const { stripeWebhookHandler } = require('./subscriptions/webhookHandler');
const { createOrRetrieveUnpaidSubscription } = require("./subscriptions/createOrRetrieveUnpaidSubscription.js");
const { createStripeCustomer } = require("./subscriptions/createStripeCustomer.js");
const { createCustomerPortalSession } = require('./subscriptions/createCustomerPortalSession');

// Callable functions: accounts
exports.requestPasswordReset = functions.https.onCall(requestPasswordReset);
exports.resendAccountVerification = functions.https.onCall(resendAccountVerification);
exports.createUser = functions.https.onCall(createUser);
exports.verifyEmail = functions.https.onCall(verifyEmail);

// Callable functions: subscriptions
exports.createStripeCustomer = functions.https.onCall(createStripeCustomer)
exports.createOrRetrieveUnpaidSubscription = functions.https.onCall(createOrRetrieveUnpaidSubscription)
exports.createCustomerPortalSession = functions.https.onCall(createCustomerPortalSession)

// Callable functions: admin functions
exports.setAdminRole = functions.https.onCall(setAdminRole);
exports.exportNewsletterEmails = functions.https.onCall(exportNewsletterEmails);
exports.updateEmail = functions.https.onCall(updateEmail);

// Auth triggers
exports.cleanupUserOnDelete = functions.auth.user().onDelete(cleanupUserOnDelete);

// Firestore triggers: campsites
exports.onCampsiteCreate = functions.firestore
  .document('campsites/{campsiteId}')
  .onCreate(onCampsiteCreate);
exports.onCampsiteDelete = functions.firestore
  .document('campsites/{campsiteId}')
  .onDelete(onCampsiteDelete);

// Firestore triggers: chats
exports.onChatCreate = functions.firestore.document('chats/{chatId}').onCreate(onChatCreate);
exports.notifyOnChat = functions.firestore
  .document('chats/{chatId}/{messages}/{messageId}')
  .onCreate(onMessageCreate);

// Subscriptions: Stipe webhook endpoint
exports.stripeWebhooks = functions.https.onRequest(stripeWebhookHandler);

// Scheduled tasks
exports.scheduledFirestoreBackup = functions.pubsub.schedule('every 6 hours').onRun(doBackup);

