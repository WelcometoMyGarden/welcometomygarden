const functions = require('firebase-functions');
// https://stackoverflow.com/a/69959606/4973029
// eslint-disable-next-line import/no-unresolved
const { getFirestore } = require('firebase-admin/firestore');
// eslint-disable-next-line import/no-unresolved
const { getAuth } = require('firebase-admin/auth');
const { parseAsync } = require('json2csv');
const sendgrid = require('@sendgrid/mail');
const removeEndingSlash = require('./util/removeEndingSlash');

const API_KEY = functions.config().sendgrid.send_key;
const FRONTEND_URL = removeEndingSlash(functions.config().frontend.url);

const auth = getAuth();
const db = getFirestore();

const send = (msg) => sendgrid.send(msg);

if (API_KEY != null) {
  sendgrid.setApiKey(API_KEY);
}

/**
 * Don't allow sending email when there is no API key, or the API key is not the production key.
 * For now, we have only configured mail templates in the production environment.
 * @type {boolean}
 */
const canSendMail = API_KEY != null;

const NO_API_KEY_WARNING =
  "You don't have an SendGrid API key set in your .runtimeconfig.json, " +
  'or it is not the production key. ' +
  'No emails will be sent. Inspect the logs to see what would have been sent by email';

/**
 * @param {string} email
 * @param {string} name
 * @param {string} verificationLink
 * @param {string} language
 */
exports.sendAccountVerificationEmail = (email, name, verificationLink, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-56d23ef8795d470eb4a615101f45a1bb';
      break;
    case 'nl':
      templateId = 'd-3bfeec1f2b3d4849bb725c74805f8592';
      break;
    default:
      templateId = 'd-9fa3c99cbc4e410ca2d51db0f5048276';
      break;
  }

  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamic_template_data: {
      firstName: name,
      verificationLink
    }
  };

  if (!canSendMail) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    // To help debugging the /auth/action verification page, transform the local auth URL
    if (verificationLink.includes('/emulator/action')) {
      console.info(
        'Transformed /auth/action URL: ',
        `"${verificationLink.replace(/http:\/\/[^/]+\/emulator/, `${FRONTEND_URL}/auth`)}"`
      );
    }
    return Promise.resolve();
  }

  return send(msg);
};

exports.sendPasswordResetEmail = (email, name, resetLink) => {
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId: 'd-e30e97d29db9487aaea9b690c84ca7b0',
    dynamic_template_data: {
      firstName: name,
      resetLink
    }
  };

  if (!canSendMail) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    return Promise.resolve();
  }

  return send(msg);
};

/**
 *
 * @param {string} email
 * @param {string} firstName
 * @param {string} senderName
 * @param {string} message
 * @param {string} messageUrl
 * @param {string} language
 * @returns
 */
exports.sendMessageReceivedEmail = (
  email,
  firstName,
  senderName,
  message,
  messageUrl,
  language
) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-274cca0cb26b4c3d9d2bfd224d5aa6f0';
      break;
    case 'nl':
      templateId = 'd-bddbb11eae8849d29eda3d90bad6534c';
      break;
    default:
      templateId = 'd-9f8e900fee7d49bdabb79852de387609';
      break;
  }

  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamic_template_data: {
      firstName,
      senderName,
      messageUrl,
      message
    }
  };

  if (!canSendMail) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    return Promise.resolve();
  }

  return send(msg);
};

/**
 *
 * @param {string} language
 * @param {string} email
 * @param {string} firstName
 * @returns
 */
exports.sendSubscriptionConfirmationEmail = (email, firstName, language) => {
  let templateId;
  switch (language) {
    case 'fr':
      templateId = 'd-5f9ab48669e545669511a64789a50c92';
      break;
    case 'nl':
      templateId = 'd-bd1e491ad7a6463bac3649eb91d3a342';
      break;
    default:
      templateId = 'd-239412fbd44141e0a227c32b4d75b906';
      break;
  }

  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId,
    dynamic_template_data: {
      firstName,
      exploreFeaturesLink: `${FRONTEND_URL}/explore`
    }
  };

  if (!canSendMail) {
    console.warn(NO_API_KEY_WARNING);
    console.info(JSON.stringify(msg));
    return Promise.resolve();
  }

  return send(msg);
};

const fail = (code, message = '') => {
  throw new functions.https.HttpsError(code, message || code);
};

exports.exportNewsletterEmails = async (_, context) => {
  if (!context.auth) {
    return fail('unauthenticated');
  }

  const { uid } = context.auth;
  const adminUser = await auth.getUser(uid);
  if (!adminUser.customClaims || !adminUser.customClaims.admin) {
    return fail('permission-denied');
  }

  const spliceIntoChunks = (arr, chunkSize) => {
    const res = [];
    while (arr.length > 0) {
      const chunk = arr.splice(0, chunkSize);
      res.push(chunk);
    }
    return res;
  };

  const snapshot = await db.collection('users-private').get();
  const ids = [];
  snapshot.forEach((u) => {
    const user = u.data();
    if (user.emailPreferences.news) ids.push({ uid: u.id });
  });

  // Firebase has a limit on how many ids you can pass to getUsers at once, so we chunk operations.
  // The limit is 100 identifiers per getUsers request.
  // https://firebase.google.com/docs/auth/admin/manage-users#bulk_retrieve_user_data
  const queue = [];
  const chunks = spliceIntoChunks(ids, 90);
  chunks.forEach((chunk) => {
    queue.push(auth.getUsers(chunk));
  });

  const chunkedResolved = await Promise.all(queue);
  const emails = [];
  chunkedResolved.forEach((resolved) => {
    resolved.users.forEach((user) => {
      emails.push({ email: user.email });
    });
    resolved.notFound.forEach(() => {
      // run delete
    });
  });

  return parseAsync(emails, { fields: ['email'] });
};
