const functions = require('firebase-functions');

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
