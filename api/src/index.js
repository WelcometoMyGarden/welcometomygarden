// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const { region, config } = require('firebase-functions');
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
const { handleRenewals } = require('./subscriptions/handleRenewals');
const { discourseConnectLogin } = require('./discourse/discourseConnectLogin');
const { createUser } = require('./user/createUser');
const { cleanupUserOnDelete } = require('./user/cleanupUserOnDelete');
const { onUserWrite } = require('./user/onUserWrite');
const { onUserPrivateWrite } = require('./user/onUserPrivateWrite');
const { parseInboundEmail, dumpInboundEmail } = require('./sendgrid/parseInboundEmail');
const onChatsWrite = require('./replication/onChatsWrite');
const onCampsitesWrite = require('./replication/onCampsitesWrite');
const { multiplexFirestoreTrigger } = require('./replication/shared');
const onUsersWriteReplicate = require('./replication/onUsersWrite');
const onUsersPrivateWriteReplicate = require('./replication/onUsersPrivateWrite');
const onUserPrivateSubcollectionWrite = require('./replication/onUsersPrivateSubWrite');
const onMessagesWriteReplicate = require('./replication/onMessagesWrite');

// Regions
// This is in Belgium! All new functions should be deployed here.
const euWest1 = region('europe-west1');
// Historically functions were hosted here. Most old ones still do, until we
// migrate them safely.
const usCentral1 = region('us-central1');

const shouldReplicate = !config().supabase?.disable_replication;

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

// HTTP functions:
//  Stripe webhook endpoint
exports.stripeWebhooks = euWest1.https.onRequest(stripeWebhookHandler);
//  Handle SendGrid Inbound Email
exports.parseInboundEmail = euWest1.https.onRequest(parseInboundEmail);

// Auth triggers
exports.cleanupUserOnDelete = usCentral1.auth.user().onDelete(cleanupUserOnDelete);

// Firestore triggers: users
exports.onUserPrivateWrite = euWest1
  .runWith({
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  })
  .firestore.document('users-private/{userId}')
  // @ts-ignore
  .onWrite(
    multiplexFirestoreTrigger([
      onUserPrivateWrite,
      ...(shouldReplicate ? [onUsersPrivateWriteReplicate] : [])
    ])
  );
// @ts-ignore
exports.onUserWrite = euWest1.firestore
  .document('users/{userId}')
  .onWrite(
    multiplexFirestoreTrigger([onUserWrite, ...(shouldReplicate ? [onUsersWriteReplicate] : [])])
  );

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

// Additional replication triggers not covered above
if (shouldReplicate) {
  exports.onCampsiteWrite = euWest1.firestore
    .document('campsites/{campsiteId}')
    .onWrite(onCampsitesWrite);
  exports.onChatWrite = euWest1.firestore.document('chats/{chatId}').onWrite(onChatsWrite);
  exports.onMessageWrite = euWest1.firestore
    .document('chats/{chatId}/messages/{messageId}')
    .onWrite(onMessagesWriteReplicate);
  // for subcollections `push-registrations`, `unreads`, and `trails`
  exports.onUserPrivateSubcollectionWrite = euWest1.firestore
    .document('users-private/{userId}/{subcollection}/{documentId}')
    .onWrite(onUserPrivateSubcollectionWrite);
}

// Scheduled tasks
exports.scheduledFirestoreBackup = usCentral1.pubsub.schedule('every day 03:30').onRun(doBackup);
// Run every hour
exports.handleRenewals = euWest1.pubsub.schedule('0 * * * *').onRun(handleRenewals);

// Testing
//
// Only for testing the above handleRenewals function!
// Note: this is outdated, and was used before a (docs) param was added.
// exports.cancelUnpaidRenewalsTest = euWest1.https.onRequest(cancelUnpaidRenewals);
if (process.env.NODE_ENV !== 'production') {
  exports.dumpInboundEmail = euWest1.https.onRequest(dumpInboundEmail);
}
