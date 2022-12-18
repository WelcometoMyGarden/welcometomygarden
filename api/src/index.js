// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { initializeApp } = require('firebase-admin/app');

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
const {
  createOrRetrieveUnpaidSubscription
} = require('./subscriptions/createOrRetrieveUnpaidSubscription');
const { createStripeCustomer } = require('./subscriptions/createStripeCustomer');
const { createCustomerPortalSession } = require('./subscriptions/createCustomerPortalSession');

// Regions
// This is in Belgium! All new functions should be deployed here.
const euWest1 = functions.region('europe-west1');
// Historically functions were hosted here. Most old ones still do, until we
// migrate them safely.
const usCentral1 = functions.region('us-central1');

// Callable functions: accounts
exports.requestPasswordReset = functions.https.onCall(requestPasswordReset);
exports.resendAccountVerification = functions.https.onCall(resendAccountVerification);
exports.createUser = functions.https.onCall(createUser);
exports.verifyEmail = functions.https.onCall(verifyEmail);

// Callable functions: subscriptions
exports.createStripeCustomer = euWest1.https.onCall(createStripeCustomer);
exports.createOrRetrieveUnpaidSubscription = euWest1.https.onCall(
  createOrRetrieveUnpaidSubscription
);
exports.createCustomerPortalSession = euWest1.https.onCall(createCustomerPortalSession);

// Callable functions: admin functions
exports.setAdminRole = usCentral1.https.onCall(setAdminRole);
exports.exportNewsletterEmails = usCentral1.https.onCall(exportNewsletterEmails);
exports.updateEmail = usCentral1.https.onCall(updateEmail);

// HTTP function: Stripe webhook endpoint
exports.stripeWebhooks = euWest1.https.onRequest(stripeWebhookHandler);

// Auth triggers
exports.cleanupUserOnDelete = usCentral1.auth.user().onDelete(cleanupUserOnDelete);

// Firestore triggers: campsites
exports.onCampsiteCreate = usCentral1.firestore
  .document('campsites/{campsiteId}')
  .onCreate(onCampsiteCreate);
exports.onCampsiteDelete = usCentral1.firestore
  .document('campsites/{campsiteId}')
  .onDelete(onCampsiteDelete);

// Firestore triggers: chats
exports.onChatCreate = usCentral1.firestore.document('chats/{chatId}').onCreate(onChatCreate);
exports.notifyOnChat = usCentral1.firestore
  .document('chats/{chatId}/{messages}/{messageId}')
  .onCreate(onMessageCreate);

// Scheduled tasks
exports.scheduledFirestoreBackup = functions.pubsub.schedule('every 6 hours').onRun(doBackup);
