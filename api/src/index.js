const { setGlobalOptions, onInit } = require('firebase-functions/v2');
const { onRequest, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const {
  onDocumentCreated,
  onDocumentWritten,
  onDocumentDeleted,
  onDocumentCreatedWithAuthContext
} = require('firebase-functions/v2/firestore');
const { projectID } = require('firebase-functions/params');

const admin = require('firebase-admin');

// Initialization conflicts may arise with seeders/app.js
if (!admin.apps.length) {
  // this will warn: params.PROJECT_ID.value() invoked during function deployment, instead of during runtime
  // This is usually a mistake. In configs, use Params directly without calling .value().
  if (projectID.value().startsWith('demo-')) {
    // This is used as a potentially hacky way to make getFunctions.taskQueue(...).enqueue(...)
    // work locally in an emulator (or in CI) _without_ requiring a log-in to Firebase/Google
    // The admin SDK also does this internally, but still hangs on an auth attempt.
    admin.initializeApp({
      serviceAccountId: 'emulated-service-acct@email.com',
      // both below properties have to be made explicit if the serviceAccountId option is given
      projectId: 'demo-test',
      storageBucket: 'demo-test.appspot.com'
    });
  } else {
    admin.initializeApp();
  }
}

const { region: regionV1, RESET_VALUE } = require('firebase-functions/v1');
const { updateEmail } = require('./auth');
const { doBackup } = require('./storage');
const { onMessageCreate, onChatCreate } = require('./chat');
const { onPushRegistrationWrite } = require('./user/onPushRegistrationWrite');

const { onCampsiteCreate, onCampsiteDelete } = require('./campsites');
const { stripeWebhookHandler } = require('./subscriptions/webhookHandler');
const { handleRenewals } = require('./subscriptions/handleRenewals');
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
const relistGardens = require('./scheduled/relistGardens');
const { shouldReplicateRuntime, isContactSyncDisabled } = require('./sharedConfig');
const { initialize: initSupabase } = require('./supabase');
const onCampsiteListedChange = require('./user/onCampsiteListedChange');
const { indexCallable } = require('./indexCallable');
const { handleUnsubscribeRouter } = require('./sendgrid/manageEmailPreferences');
const { handleManageSubscription } = require('./subscriptions/manageSubscription');
const { onTaskDispatched } = require('firebase-functions/tasks');
const checkContactCreation = require('./sendgrid/checkContactCreation');
const { sendQueuedMessage } = require('./queued/sendQueuedMessage');
const syncCampsiteStatus = require('./sendgrid/syncCampsiteStatus');
const { errorLogTunnel } = require('./errorLogTunnel');

onInit(() => {
  initSendgrid();
  initSupabase();
});

const whenSupabaseReplicating =
  (func) =>
  (...args) =>
    guardOn(shouldReplicateRuntime(), func)(...args);

const whenSendGridSyncing =
  (func) =>
  (...args) =>
    guardOn(!isContactSyncDisabled(), func)(...args);

// Firebase functions v1 regions; still required for auth trigger functions.
// This is in Belgium! All new functions should be deployed here.
const DEFAULT_REGION = 'europe-west1';
const euWest1V1 = regionV1(DEFAULT_REGION);

// set v2 function global options
setGlobalOptions({
  region: DEFAULT_REGION,
  // TEMPORARY FIX: remove concurrency
  // https://firebase.google.com/docs/functions/2nd-gen-upgrade#audit_global_variable_usage
  cpu: 'gcf_gen1',
  concurrency: 1,
  // Assuming effective concurrency of 1 using gcf_gen1,
  // with each concurrent user requiring a new instance.
  maxInstances: 500
});

// Define original v2 defaults to reset the overriden global defaults where desired
/**
 * @satisfies {import('firebase-functions/v2/https').HttpsOptions}
 */
const resetFunctionsV2DefaultHttpsOptions = {
  cpu: 1,
  concurrency: RESET_VALUE,
  // Should be multiplied by concurrency of 80 to get an estimate of concurrent requests: 1600
  maxInstances: 20
};

const indexCallableMinInstanceConfig = projectID.equals('wtmg-production').thenElse(1, 0);

// Callable functions: bundled user action functions (1 warm instance to avoid cold boots)
exports.indexCallable = onCall(
  { ...resetFunctionsV2DefaultHttpsOptions, minInstances: indexCallableMinInstanceConfig },
  indexCallable
);

// Callable functions: admin functions
exports.updateEmail = onCall(updateEmail);

// HTTP functions:
// Stripe webhook endpoint
exports.handleStripeWebhookV2 = onRequest(
  resetFunctionsV2DefaultHttpsOptions,
  stripeWebhookHandler
);
// Handle SendGrid Inbound Email
exports.parseInboundEmailV2 = onRequest(resetFunctionsV2DefaultHttpsOptions, parseInboundEmail);
// To handle List-Unsubscribe=One-Click calls
// To test the folling two, use Firebase Hosting's dynamic rewrite function. See dev-env.md.
exports.handleUnsubscribe = onRequest(resetFunctionsV2DefaultHttpsOptions, handleUnsubscribeRouter);
// Authenticated (email + secret) subscription management links from emails.
exports.handleManageSubscription = onRequest(
  resetFunctionsV2DefaultHttpsOptions,
  handleManageSubscription
);
exports.errorLogTunnel = onRequest(resetFunctionsV2DefaultHttpsOptions, errorLogTunnel);

// Firebase Auth triggers
exports.onAuthUserDelete = euWest1V1.auth.user().onDelete(cleanupUserOnDelete);
exports.onAuthUserCreate = euWest1V1.auth.user().onCreate(onAuthUserCreate);

// Firestore triggers: users
exports.onUserPrivateWriteV2 = onDocumentWritten(
  {
    document: 'users-private/{userId}',
    ...resetFunctionsV2DefaultHttpsOptions
  },
  executeFirestoreTriggersConcurrently([
    onUserPrivateWrite,
    whenSupabaseReplicating(onUsersPrivateWriteReplicate)
  ])
);

exports.onUserWriteV2 = onDocumentWritten(
  { document: 'users/{userId}', resetFunctionsV2DefaultHttpsOptions },
  executeFirestoreTriggersConcurrently([
    onUserWrite,
    whenSupabaseReplicating(onUsersWriteReplicate)
  ])
);

// Firestore triggers: campsites
exports.onCampsiteCreateV2 = onDocumentCreated('campsites/{campsiteId}', onCampsiteCreate);
exports.onCampsiteDeleteV2 = onDocumentDeleted('campsites/{campsiteId}', onCampsiteDelete);

// Firestore triggers: chats
exports.onChatCreateV2 = onDocumentCreatedWithAuthContext('chats/{chatId}', onChatCreate);
exports.onMessageCreateV2 = onDocumentCreated(
  'chats/{chatId}/{messages}/{messageId}',
  onMessageCreate
);

// Additional replication triggers not covered above.
exports.onCampsiteWriteV2 = onDocumentWritten(
  'campsites/{campsiteId}',
  executeFirestoreTriggersConcurrently([
    seralizeFirestoreTriggers([
      whenSupabaseReplicating(onCampsitesWriteReplicate),
      onCampsiteListedChange
    ]),
    whenSendGridSyncing(syncCampsiteStatus)
  ])
);
exports.onChatWriteV2 = onDocumentWritten('chats/{chatId}', whenSupabaseReplicating(onChatsWrite));
exports.onMessageWriteV2 = onDocumentWritten(
  'chats/{chatId}/messages/{messageId}',
  whenSupabaseReplicating(onMessagesWriteReplicate)
);
// for subcollections `push-registrations`, `unreads`, and `trails`
exports.onUserPrivateSubcollectionWriteV2 = onDocumentWritten(
  { document: 'users-private/{userId}/{subcollection}/{documentId}' },
  executeFirestoreTriggersConcurrently([
    whenSupabaseReplicating(onUserPrivateSubcollectionWrite),
    onPushRegistrationWrite
  ])
);

// Queuable Cloud Tasks
exports.checkContactCreation = onTaskDispatched(
  {
    // It typically takes 30 seconds to 6 minutes to create a contact
    // https://firebase.google.com/docs/reference/functions/2nd-gen/node/firebase-functions.tasks.retrypolicy#properties
    retryConfig: {
      maxAttempts: 15,
      minBackoffSeconds: 60
    },
    rateLimits: {
      // Not sure if we need this, it's arbitrary
      maxConcurrentDispatches: 6
    },
    // I don't think this respects the global v2 function options
    region: 'europe-west1',
    cpu: 1
  },
  checkContactCreation
);

exports.sendMessage = onTaskDispatched(
  {
    retryConfig: {
      // We don't want to risk double emails, even in case of errors
      maxAttempts: 1
    },
    region: 'europe-west1',
    cpu: 1
  },
  sendQueuedMessage
);

// Firebase Auth scheduled replication

// Scheduled tasks
// 03:30 CDT (Iowa, us-central1 location) time in CET is 10:30 AM
// The schedule seems to be interpreted in Iowa time, but the timestamps on the output
// filenames are in CET.
// https://cloud.google.com/appengine/docs/legacy/standard/python/config/cronref#custom-interval
exports.backupFirestoreV2 = onSchedule('every day 03:30', doBackup);
// Run every hour
exports.handleRenewalsV2 = onSchedule('0 * * * *', handleRenewals);
exports.refreshAuthTableV2 = onSchedule(
  {
    schedule: 'every 6 hours',
    // It takes a bit more than a second per 1000 users
    timeoutSeconds: 60 * 5
  },
  whenSupabaseReplicating(refreshAuthTable)
);
exports.relistGardens = onSchedule(
  {
    schedule: 'every day 10:00',
    timeZone: 'Europe/Brussels'
  },
  relistGardens
);

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
