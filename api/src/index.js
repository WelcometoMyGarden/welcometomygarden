const { setGlobalOptions, onInit } = require('firebase-functions/v2');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const {
  onDocumentCreated,
  onDocumentWritten,
  onDocumentDeleted
} = require('firebase-functions/v2/firestore');

const admin = require('firebase-admin');

// Initialization conflicts may arise with seeders/app.js
if (!admin.apps.length) {
  admin.initializeApp();
}

const { region: regionV1 } = require('firebase-functions/v1');
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
const { handleRenewals } = require('./subscriptions/handleRenewals');
const { discourseConnectLogin } = require('./discourse/discourseConnectLogin');
const { createUser } = require('./user/createUser');
const { cleanupUserOnDelete } = require('./user/cleanupUserOnDelete');
const { onUserWrite } = require('./user/onUserWrite');
const { onUserPrivateWrite } = require('./user/onUserPrivateWrite');
const { parseInboundEmail } = require('./sendgrid/parseInboundEmail');
const { initialize: initSendgrid } = require('./sendgrid/sendgrid');
const onChatsWrite = require('./replication/onChatsWrite');
const onCampsitesWriteReplicate = require('./replication/onCampsitesWrite');
const {
  executeFirestoreTriggersConcurrently,
  seralizeFirestoreTriggers,
  guardOn
} = require('./replication/shared');
const onUsersWriteReplicate = require('./replication/onUsersWrite');
const onUsersPrivateWriteReplicate = require('./replication/onUsersPrivateWrite');
const onUserPrivateSubcollectionWrite = require('./replication/onUsersPrivateSubWrite');
const onMessagesWriteReplicate = require('./replication/onMessagesWrite');
const onAuthUserCreate = require('./user/onAuthUserCreate');
const refreshAuthTable = require('./replication/scheduled/refreshAuthTable');
const { shouldReplicateRuntime } = require('./sharedConfig');
const { initialize: initSupabase } = require('./supabase');
const onCampsiteListedChange = require('./user/onCampsiteListedChange');

onInit(() => {
  initSendgrid();
  initSupabase();
});

const whenReplicating =
  (func) =>
  (...args) =>
    guardOn(shouldReplicateRuntime(), func)(...args);

// Firebase functions v1 regions; still required for auth trigger functions.
// This is in Belgium! All new functions should be deployed here.
const DEFAULT_REGION = 'europe-west1';
const euWest1V1 = regionV1(DEFAULT_REGION);
// v2 function defaults
setGlobalOptions({
  region: DEFAULT_REGION,
  // TEMPORARY FIX: remove concurrency
  // https://firebase.google.com/docs/functions/2nd-gen-upgrade#audit_global_variable_usage
  cpu: 'gcf_gen1',
  concurrency: 1
});

// Extended 5 minutes timeout for function that handle SendGrid account creation
// https://firebase.google.com/docs/functions/manage-functions#set_timeout_and_memory_allocation
const SENDGRID_CONTACT_CREATION_TIMEOUT_S = 60 * 5;

// Callable functions: accounts
exports.requestPasswordResetV2 = onCall(requestPasswordReset);
exports.resendAccountVerificationV2 = onCall(resendAccountVerification);
exports.createUserV2 = onCall(createUser);
exports.requestEmailChangeV2 = onCall(requestEmailChange);
exports.propagateEmailChangeV2 = onCall(
  {
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  },
  propagateEmailChange
);
exports.discourseConnectLoginV2 = onCall(discourseConnectLogin);

// Callable functions: subscriptions
exports.createStripeCustomerV2 = onCall(createStripeCustomer);
exports.createOrRetrieveUnpaidSubscriptionV2 = onCall(createOrRetrieveUnpaidSubscription);
// unused
// exports.createCustomerPortalSession = onCall(createCustomerPortalSession);

// Callable functions: admin functions
exports.setAdminRole = onCall(setAdminRole);
exports.verifyEmail = onCall(verifyEmail);
exports.updateEmail = onCall(
  {
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  },
  updateEmail
);

// HTTP functions:
//  Stripe webhook endpoint
exports.handleStripeWebhookV2 = onRequest(stripeWebhookHandler);
//  Handle SendGrid Inbound Email
exports.parseInboundEmailV2 = onRequest(parseInboundEmail);

// Firebase Auth triggers
exports.cleanupUserOnDelete = euWest1V1.auth.user().onDelete(cleanupUserOnDelete);
exports.onAuthUserCreate = euWest1V1.auth.user().onCreate(whenReplicating(onAuthUserCreate));

// Firestore triggers: users
exports.onUserPrivateWrite = onDocumentWritten(
  {
    document: 'users-private/{userId}',
    timeoutSeconds: SENDGRID_CONTACT_CREATION_TIMEOUT_S
  },
  executeFirestoreTriggersConcurrently([
    onUserPrivateWrite,
    whenReplicating(onUsersPrivateWriteReplicate)
  ])
);

// @ts-ignore
exports.onUserWrite = onDocumentWritten(
  'users/{userId}',
  executeFirestoreTriggersConcurrently([onUserWrite, whenReplicating(onUsersWriteReplicate)])
);

// Firestore triggers: campsites
exports.onCampsiteCreate = onDocumentCreated('campsites/{campsiteId}', onCampsiteCreate);
exports.onCampsiteDelete = onDocumentDeleted('campsites/{campsiteId}', onCampsiteDelete);

// Firestore triggers: chats
exports.onChatCreate = onDocumentCreated('chats/{chatId}', onChatCreate);
exports.notifyOnChat = onDocumentCreated('chats/{chatId}/{messages}/{messageId}', onMessageCreate);

// Additional replication triggers not covered above
// Note: this is not fully condition on replication
exports.onCampsiteWrite = onDocumentWritten(
  'campsites/{campsiteId}',
  seralizeFirestoreTriggers([whenReplicating(onCampsitesWriteReplicate), onCampsiteListedChange])
);
exports.onChatWrite = onDocumentWritten('chats/{chatId}', whenReplicating(onChatsWrite));
exports.onMessageWrite = onDocumentWritten(
  'chats/{chatId}/messages/{messageId}',
  whenReplicating(onMessagesWriteReplicate)
);
// for subcollections `push-registrations`, `unreads`, and `trails`
exports.onUserPrivateSubcollectionWrite = onDocumentWritten(
  'users-private/{userId}/{subcollection}/{documentId}',
  whenReplicating(onUserPrivateSubcollectionWrite)
);

// Firebase Auth scheduled replication

// Scheduled tasks
// 03:30 CDT (Iowa, us-central1 location) time in CET is 10:30 AM
// The schedule seems to be interpreted in Iowa time, but the timestamps on the output
// filenames are in CET.
// TODO what is the impact if we change the region to Brussels?
// https://cloud.google.com/appengine/docs/legacy/standard/python/config/cronref#custom-interval
exports.scheduledFirestoreBackup = onSchedule('every day 03:30', doBackup);
// Run every hour
exports.handleRenewals = onSchedule('0 * * * *', handleRenewals);
exports.refreshAuthTable = onSchedule('every 6 hours', whenReplicating(refreshAuthTable));

// Testing
//
// Only for testing the above handleRenewals function!
// Note: this is outdated, and was used before a (docs) param was added.
// const isDevelopment = process.env.NODE_ENV !== 'production';
// exports.cancelUnpaidRenewalsTest = onRequest(guardOn(isDevelopment, cancelUnpaidRenewals));
// exports.dumpInboundEmail = onRequest(guardOn(isDevelopment, dumpInboundEmail));
// exports.refreshAuthTableTest = onRequest(
//   guardOn(isDevelopment, async (_, res) => {
//     await refreshAuthTable();
//     res.send(200);
//   })
// );
