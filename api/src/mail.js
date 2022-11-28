const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { parseAsync } = require('json2csv');
const sendgrid = require('@sendgrid/mail');

const API_KEY = functions.config().sendgrid.key;

const send = (msg) => sendgrid.send(msg);

sendgrid.setApiKey(API_KEY);

exports.sendAccountVerificationEmail = (email, name, verificationLink) => {
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId: 'd-9fa3c99cbc4e410ca2d51db0f5048276',
    dynamic_template_data: {
      firstName: name,
      verificationLink
    }
  };

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

  return send(msg);
};

exports.sendMessageReceivedEmail = (email, firstName, senderName, message, messageUrl) => {
  const msg = {
    to: email,
    from: 'Welcome To My Garden <support@welcometomygarden.org>',
    templateId: 'd-9f8e900fee7d49bdabb79852de387609',
    dynamic_template_data: {
      firstName,
      senderName,
      messageUrl,
      message
    }
  };

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
  const adminUser = await admin.auth().getUser(uid);
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

  const db = admin.firestore();

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
    queue.push(admin.auth().getUsers(chunk));
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
