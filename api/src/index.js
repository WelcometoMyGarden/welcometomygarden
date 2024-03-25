// @ts-check
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const functions = require('firebase-functions');
const {
  requestPasswordReset,
  resendAccountVerification,
  setAdminRole,
  verifyEmail,
  updateEmail,
  requestEmailChange,
  propagateEmailChange
} = require('./auth');
const { doBackup } = require('./storage');
const { onMessageCreate, onChatCreate } = require('./chat');
const { onCampsiteCreate, onCampsiteDelete } = require('./campsites');
const { stripeWebhookHandler } = require('./subscriptions/webhookHandler');
const {
  createOrRetrieveUnpaidSubscription
} = require('./subscriptions/createOrRetrieveUnpaidSubscription');
const { createStripeCustomer } = require('./subscriptions/createStripeCustomer');
const { createCustomerPortalSession } = require('./subscriptions/createCustomerPortalSession');
const handleRenewals = require('./subscriptions/handleRenewals');
const { discourseConnectLogin } = require('./discourse/discourseConnectLogin');
const { createUser } = require('./user/createUser');
const { cleanupUserOnDelete } = require('./user/cleanupUserOnDelete');
const { onUserWrite } = require('./user/onUserWrite');
const { onUserPrivateWrite } = require('./user/onUserPrivateWrite');

// Regions
// This is in Belgium! All new functions should be deployed here.
const euWest1 = functions.region('europe-west1');
// Historically functions were hosted here. Most old ones still do, until we
// migrate them safely.
const usCentral1 = functions.region('us-central1');

// Extended 5 minutes timeout for function that handle SendGrid account creation
// https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation
const SENDGRID_CONTACT_CREATION_TIMEOUT_S = 60 * 5;

// Callable functions: accounts
exports.requestPasswordReset = usCentral1.https.onCall(requestPasswordReset);
exports.resendAccountVerification = usCentral1.https.onCall(resendAccountVerification);
exports.createUser = usCentral1.https.onCall(createUser);
exports.verifyEmail = usCentral1.https.onCall(verifyEmail);
exports.requestEmailChange = euWest1.https.onCall(requestEmailChange);
exports.propagateEmailChange = euWest1
  .runWith({
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  })
  .https.onCall(propagateEmailChange);
exports.discourseConnectLogin = euWest1.https.onCall(discourseConnectLogin);

// Callable functions: subscriptions
exports.createStripeCustomer = euWest1.https.onCall(createStripeCustomer);
exports.createOrRetrieveUnpaidSubscription = euWest1.https.onCall(
  createOrRetrieveUnpaidSubscription
);
exports.createCustomerPortalSession = euWest1.https.onCall(createCustomerPortalSession);

// Callable functions: admin functions
exports.setAdminRole = usCentral1.https.onCall(setAdminRole);
exports.updateEmail = usCentral1
  .runWith({
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  })
  .https.onCall(updateEmail);

// HTTP function: Stripe webhook endpoint
exports.stripeWebhooks = euWest1.https.onRequest(stripeWebhookHandler);

// Auth triggers
exports.cleanupUserOnDelete = usCentral1.auth.user().onDelete(cleanupUserOnDelete);

// Firestore triggers: users
exports.onUserPrivateWrite = euWest1
  .runWith({
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  })
  .firestore.document('users-private/{userId}')
  // @ts-ignore
  .onWrite(onUserPrivateWrite);
// @ts-ignore
exports.onUserWrite = euWest1.firestore.document('users/{userId}').onWrite(onUserWrite);

// Firestore triggers: campsites
exports.onCampsiteCreate = usCentral1.firestore
  .document('campsites/{campsiteId}')
  // @ts-ignore
  .onCreate(onCampsiteCreate);
exports.onCampsiteDelete = usCentral1.firestore
  .document('campsites/{campsiteId}')
  // @ts-ignore
  .onDelete(onCampsiteDelete);

// Firestore triggers: chats
exports.onChatCreate = usCentral1.firestore.document('chats/{chatId}').onCreate(onChatCreate);
exports.notifyOnChat = usCentral1.firestore
  .document('chats/{chatId}/{messages}/{messageId}')
  .onCreate(onMessageCreate);

// Scheduled tasks
exports.scheduledFirestoreBackup = functions.pubsub.schedule('every day 03:30').onRun(doBackup);
exports.handleRenewals = functions.pubsub.schedule('every hour').onRun(handleRenewals);

// Only for testing the above cancellation function!
// exports.cancelUnpaidRenewalsTest = euWest1.https.onRequest(cancelUnpaidRenewals);
